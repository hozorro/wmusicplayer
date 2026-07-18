import type { SlotId, AudioSlot, EngineOptions, EngineContext, LoadResult, PlayResult, TransitionResult } from './types'
import { SlotStatus } from './types'
import type { PlayerTrack } from '../types'
import { EngineState } from '../state'

import type { AudioEventHandler, IAudioBinder, IAudioEngine, IAudioSourceProvider } from './interfaces'

import { createQueue } from './queue'
import { createBinder } from './binder'
import { EngineEvent, EngineEventBus } from './events'

/**
 * Engine 内部状态修改接口
 */
interface EngineActions {
  setInitialized(value: boolean): void
  setDestroyed(value: boolean): void
  setEngineState(state: EngineState): void
  setActiveSlot(slot: AudioSlot): void
  setStandbySlot(slot: AudioSlot): void
}

interface AudioEventHandlerOptions {
  context: EngineContext
  actions: EngineActions
  eventBus: EngineEventBus
}

/**
 * 创建 AudioSlot
 *
 * AudioSlot 生命周期完全由 Engine 管理。
 */
function createAudioSlot(id: SlotId, audio: HTMLAudioElement): AudioSlot {
  return {
    id,
    audio,
    track: null,
    playPromise: null,
    abortController: null,
    status: SlotStatus.Empty,
  }
}

/**
 * 创建 Audio Event Handler
 *
 */
function createHandler(options: AudioEventHandlerOptions): AudioEventHandler {
  const { context, actions, eventBus } = options
  return {
    onLoadStart(slot) {
      slot.status = SlotStatus.Loading
      actions.setEngineState(EngineState.Loading)
    },

    onLoadedMetadata() {

    },

    onCanPlay(slot) {
      slot.status = SlotStatus.Ready
      // 双audio下此处可能有问题， canplay实际是standbySlot的状态，在activeSlot ending事件前，不可能变为Playing
      if (context.state === EngineState.Buffering) {
        actions.setEngineState(EngineState.Playing)
      }
      
      eventBus.emit(EngineEvent.CanPlay, undefined)
    },

    onPlay(slot) {
      actions.setActiveSlot(slot)
      actions.setEngineState(EngineState.Playing)
      eventBus.emit(EngineEvent.Play, { track: slot.track! })
    },

    onPause(slot) {
      actions.setEngineState(EngineState.Paused)
      if(!slot.track) return
      eventBus.emit(EngineEvent.Pause, { 
        track: slot.track,
        currentTime: slot.audio.currentTime,
      })
    },

    onTimeUpdate(slot) {
      const duration = slot.audio.duration

      if (Number.isFinite(duration)) {
        const remaining = duration - slot.audio.currentTime

        if (remaining <= options.context.options.transitionMonitorWindow / 1000) {
          const transition_remaining = remaining - options.context.options.transitionThreshold
          setTimeout(() => eventBus.emit(EngineEvent.Ending, { track: slot.track! }), transition_remaining)
        }
      }
      eventBus.emit(EngineEvent.TimeUpdate, { 
        currentTime: slot.audio.currentTime,
        duration: slot.audio.duration,
      })
    },

    onWaiting() {
      actions.setEngineState(EngineState.Buffering)
      eventBus.emit(EngineEvent.Waiting, undefined)
    },

    onEnded(slot) {
      actions.setEngineState(EngineState.Ended)
      if(!slot.track) return
      eventBus.emit(EngineEvent.Ended, { track: slot.track })
    },

    onError(slot, error) {
      slot.status = SlotStatus.Error
      actions.setEngineState(EngineState.Error)
      eventBus.emit(EngineEvent.Error, {
        error,
        track: slot.track ?? undefined,
      })
    },
  }
}

function resetSlot(slot: AudioSlot | null): void {
  if (!slot) return
  slot.abortController?.abort()
  slot.abortController = null
  slot.playPromise = null
  slot.track = null
  slot.audio.pause()
  slot.audio.removeAttribute('src')
  slot.audio.load()
  slot.status = SlotStatus.Empty
}

/**
 * 创建 AudioEngine
 */
export function createAudioEngine(
  resolver: IAudioSourceProvider,
  options: EngineOptions,
): IAudioEngine {

  /**
   * Engine Context
   */
  const context: EngineContext = {
    initialized: false,
    destroyed: false,
    state: EngineState.Idle,
    activeSlot: null,
    standbySlot: null,
    options,
  }

  let slotA: AudioSlot | null = null
  let slotB: AudioSlot | null = null

  function ensureAvailable(): void {
    if (!context.initialized) {
      throw new Error('AudioEngine is not initialized.')
    }

    if (context.destroyed) {
      throw new Error('AudioEngine has been destroyed.')
    }
  }

  function requireActiveSlot(): AudioSlot {
    const slot = context.activeSlot
    if (!slot) {
        throw new Error("Engine not initialized.")
    }
    return slot
  }

  function requireStandbySlot(): AudioSlot {
    const slot = context.standbySlot
    if (!slot) {
        throw new Error("Engine not initialized.")
    }
    return slot
  }


  /**
   * Engine 内部状态操作
   */
  const actions: EngineActions = {
    setInitialized(value) { context.initialized = value },
    setDestroyed(value) { context.destroyed = value },
    setEngineState(state) { context.state = state },
    setActiveSlot(slot) { context.activeSlot = slot },
    setStandbySlot(slot) { context.standbySlot = slot },
  }

  const eventBus = new EngineEventBus()

  const queue = createQueue()

  let handler: AudioEventHandler | null = null
  let binder: IAudioBinder | null = null

  /**
   * 初始化 Engine
   */
  function initialize(audioA: HTMLAudioElement, audioB: HTMLAudioElement): void {
    if (context.initialized) {
      return
    }

    if (context.destroyed) {
      return
    }

    slotA = createAudioSlot("A", audioA)
    slotB = createAudioSlot("B", audioB)
    context.activeSlot = slotA
    context.standbySlot = slotB

    handler = createHandler({ context, actions, eventBus })

    binder = createBinder(handler)
    binder.bind(slotA)
    binder.bind(slotB)
    actions.setInitialized(true)

    eventBus.emit(EngineEvent.Ready, undefined)
  }

  /**
   * 销毁 Engine
   */
  function destroy(): void {
    if (context.destroyed) {
      return
    }
    resetSlot(slotA)
    resetSlot(slotB)
    binder?.destroy()
    handler = null
    binder = null
    slotA = null
    slotB = null
    context.activeSlot = null
    context.standbySlot = null
    queue.destroy()
    actions.setDestroyed(true)
    actions.setInitialized(false)
    actions.setEngineState(EngineState.Destroyed)
    eventBus.emit(EngineEvent.Destroy, undefined)
  }

  async function loadSlot(slot: AudioSlot, track: PlayerTrack): Promise<LoadResult> {
    if (!context.initialized || context.destroyed) {
      throw new Error('AudioEngine is not initialized.')
    }

    if (slot.track?.id === track.id && (slot.status === SlotStatus.Loading || slot.status === SlotStatus.Ready)) {
      return { slot, elapsed: 0, cached: true, success: true }
    }

    resetSlot(slot)
    const controller = new AbortController()
    slot.abortController = controller
    slot.track = track
    slot.status = SlotStatus.Loading

    const startedAt = performance.now()
    try {
      const url = await resolver.resolve(track, controller.signal)
      if (controller.signal.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }
      slot.track = track
      slot.audio.src = url
      slot.audio.load()
      slot.abortController = null
      return {
        slot,
        elapsed: performance.now() - startedAt,
        cached: false,
        success: true,
      }
    }
    catch (error) {
      resetSlot(slot)
      throw error
    }
  }

  async function transition(track: PlayerTrack): Promise<TransitionResult> {

    // Phase3.2, 以下为临时响应和返回
    context.activeSlot!.track = track

    return { success: true, previous: slotA!, current: slotB!, elapsed: 0 }
  }

  async function activate(): Promise<void> {

    // Phase3.2, 以下为临时返回

  }

  async function deactivate(): Promise<void> {

    // Phase3.2, 以下为临时返回

  }

  async function playSlot(slot: AudioSlot): Promise<PlayResult> {
    if (!slot.track) {
      throw new Error('No track loaded.')
    }

    // 已经有 play() 正在等待浏览器完成
    if (slot.playPromise) {
      await slot.playPromise
      return {
        slot,
        elapsed: 0,
        resumed: slot.audio.currentTime > 0,
      }
    }

    const resumed = slot.audio.currentTime > 0
    const startedAt = performance.now()

    try {
      slot.playPromise = slot.audio.play()
      await slot.playPromise
      return {
        slot,
        elapsed: performance.now() - startedAt,
        resumed,
      }
    }
    finally {
      slot.playPromise = null
    }
  }

  function pauseSlot(slot: AudioSlot): void {
    slot.audio.pause()
  }

  function stopSlot(slot: AudioSlot): void {
    resetSlot(slot)
  }

  function swapSlot(): AudioSlot {
    const active = requireActiveSlot()
    const standby = requireStandbySlot()

    if (active === standby) {
      throw new Error('Active slot and standby slot are the same.')
    }

    context.activeSlot = standby
    context.standbySlot = active

    return context.activeSlot
  }

  function updateOptions(value: Partial<EngineOptions>): void {
    context.options = {
      ...context.options,
      ...value,
    }
  }

  async function load(track: PlayerTrack): Promise<LoadResult> {
    return queue.enqueue(async () => {
      ensureAvailable()
      return loadSlot(requireActiveSlot(), track)
    })
  }

  async function preload(track: PlayerTrack): Promise<LoadResult> {
    return queue.enqueue(async() => {
      ensureAvailable()
      return loadSlot(requireStandbySlot(), track)
    })
  }

  async function play(): Promise<PlayResult> {
    return queue.enqueue(async () => {
      ensureAvailable()
      return playSlot(requireActiveSlot())
    })
  }

  async function pause(): Promise<void> {
    return queue.enqueue(async () => {
      ensureAvailable()
      pauseSlot(requireActiveSlot())
    })
  }

  async function stop(): Promise<void> {
    return queue.enqueue(async () => {
      ensureAvailable()
      stopSlot(requireActiveSlot())
    })
  }

  async function swap(): Promise<AudioSlot> {
    return queue.enqueue(async () => {
      ensureAvailable()
      return swapSlot()
    })
  }

  return {
    context,
    eventBus,
    initialize,
    destroy,
    load,
    preload,
    transition,
    activate,
    deactivate,
    play,
    pause,
    stop,
    swap,
    updateOptions,
  }
}