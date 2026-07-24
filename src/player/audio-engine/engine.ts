/**
 * Audio Engine — Engine
 *
 * The core engine that composes binder, handler, queue, and event bus.
 * Provides the EngineActions + EngineQueries interface.
 *
 * Engine only executes — it does NOT decide WHY something is executed.
 * All decisions are made by Controllers.
 */

import type { AudioSlot, AudioSlotId, SlotState } from './types'
import type { Engine as IEngine } from './interfaces'
import type { EngineEventBus } from './events'
import { createEngineEventBus } from './events'
import { createBinder, type Binder } from './binder'
import { createActionQueue, type ActionQueue } from './queue'

/**
 * Create the audio engine with two audio elements.
 *
 * @param audioA - First HTMLAudioElement (slot A)
 * @param audioB - Second HTMLAudioElement (slot B)
 */
export function createEngine(audioA: HTMLAudioElement, audioB: HTMLAudioElement): IEngine {
  const events: EngineEventBus = createEngineEventBus()
  const binder: Binder = createBinder(events)
  const queue: ActionQueue = createActionQueue()

  // Bind both audio elements
  binder.bind(audioA, audioB)

  // Listen to slot state changes from engine events to auto-update binder
  events.on('playing', (e) => binder.setSlotState(e.slotId, 'playing'))
  events.on('paused', (e) => binder.setSlotState(e.slotId, 'paused'))
  events.on('ended', (e) => binder.setSlotState(e.slotId, 'paused'))
  events.on('canplay', (e) => {
    const slot = binder.getSlot(e.slotId)
    if (slot && slot.state === 'loading') {
      binder.setSlotState(e.slotId, 'ready')
    }
  })
  events.on('error', (e) => binder.setSlotState(e.slotId, 'error'))

  // --- EngineActions ---

  function loadOnSlot(slotId: AudioSlotId, src: string, trackId: number | null): Promise<void> {
    return queue.enqueue(
      (signal) => {
        return new Promise<void>((resolve, reject) => {
          const slot = binder.getSlot(slotId)
          if (!slot) return reject(new Error(`Slot ${slotId} not found`))

          binder.setSlotState(slotId, 'loading')
          binder.setSlotTrack(slotId, trackId, src)

          const onCanplay = () => {
            slot.audio.removeEventListener('canplay', onCanplay)
            slot.audio.removeEventListener('error', onError)
            if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'))
            resolve()
          }
          const onError = () => {
            slot.audio.removeEventListener('canplay', onCanplay)
            slot.audio.removeEventListener('error', onError)
            binder.setSlotState(slotId, 'error')
            reject(new Error(`Failed to load on slot ${slotId}`))
          }

          // Check abort before starting
          if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'))

          slot.audio.addEventListener('canplay', onCanplay)
          slot.audio.addEventListener('error', onError)
          slot.audio.src = src
          slot.audio.load()
        })
      },
      { interruptible: true },
    )
  }

  function playSlot(slotId: AudioSlotId): Promise<void> {
    return queue.enqueue(
      (signal) => {
        return new Promise<void>((resolve, reject) => {
          const slot = binder.getSlot(slotId)
          if (!slot) return reject(new Error(`Slot ${slotId} not found`))

          if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'))

          slot.audio
            .play()
            .then(() => {
              if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'))
              resolve()
            })
            .catch((err) => {
              // AbortError from interruption is expected
              if (err instanceof DOMException && err.name === 'AbortError') {
                return reject(err)
              }
              binder.setSlotState(slotId, 'error')
              reject(err)
            })
        })
      },
      { interruptible: true },
    )
  }

  function pauseSlot(slotId: AudioSlotId): void {
    const slot = binder.getSlot(slotId)
    if (slot) {
      slot.audio.pause()
    }
  }

  function seekSlot(slotId: AudioSlotId, time: number): void {
    const slot = binder.getSlot(slotId)
    if (slot && !isNaN(slot.audio.duration)) {
      slot.audio.currentTime = time
    }
  }

  function setPlaybackRate(slotId: AudioSlotId, rate: number): void {
    const slot = binder.getSlot(slotId)
    if (slot) {
      slot.audio.playbackRate = rate
    }
  }

  function prepareStandby(src: string, trackId: number | null): Promise<void> {
    const standby = binder.getStandbySlot()
    if (!standby) return Promise.reject(new Error('No standby slot'))
    return loadOnSlot(standby.id, src, trackId)
  }

  function swapSlots(): void {
    binder.swapActiveStandby()
  }

  // --- EngineQueries ---

  function getActiveSlot(): AudioSlot | null {
    return binder.getActiveSlot()
  }

  function getStandbySlot(): AudioSlot | null {
    return binder.getStandbySlot()
  }

  function getSlot(slotId: AudioSlotId): AudioSlot | null {
    return binder.getSlot(slotId)
  }

  function getSlotState(slotId: AudioSlotId): SlotState {
    return binder.getSlot(slotId)?.state ?? 'idle'
  }

  function getActiveCurrentTime(): number {
    const slot = binder.getActiveSlot()
    return slot ? slot.audio.currentTime : 0
  }

  function getActiveDuration(): number {
    const slot = binder.getActiveSlot()
    return slot ? slot.audio.duration || 0 : 0
  }

  function isActivePlaying(): boolean {
    const slot = binder.getActiveSlot()
    return slot ? slot.state === 'playing' : false
  }

  // --- Lifecycle ---

  function dispose(): void {
    queue.dispose()
    binder.unbind()
    events.removeAll()
    // Reset audio elements
    audioA.pause()
    audioA.removeAttribute('src')
    audioA.load()
    audioB.pause()
    audioB.removeAttribute('src')
    audioB.load()
  }

  return {
    // Events
    events,

    // Actions
    loadOnSlot,
    playSlot,
    pauseSlot,
    seekSlot,
    setPlaybackRate,
    prepareStandby,
    swapSlots,

    // Queries
    getActiveSlot,
    getStandbySlot,
    getSlot,
    getSlotState,
    getActiveCurrentTime,
    getActiveDuration,
    isActivePlaying,

    // Lifecycle
    dispose,
  }
}
