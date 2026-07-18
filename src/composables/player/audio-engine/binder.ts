/**
 * Audio Binder
 *
 * 职责：
 * 1. 管理 HTMLAudioElement 事件绑定
 * 2. 管理事件解绑
 * 3. 不处理任何播放器业务逻辑
 */

import type { AudioSlot } from './types'
import type { AudioEventHandler, IAudioBinder } from './interfaces'

/**
 * Audio DOM Event Listener
 */
type AudioListener = (event: Event) => void

/**
 * 每个 Audio 对应的一组 Listener
 * 用于 removeEventListener()
 */
interface AudioListenerMap {
  loadstart: AudioListener
  loadedmetadata: AudioListener
  canplay: AudioListener

  play: AudioListener
  pause: AudioListener

  timeupdate: AudioListener

  waiting: AudioListener

  seeking: AudioListener
  seeked: AudioListener

  ended: AudioListener

  error: AudioListener
}

/**
 * 创建 Binder
 */
export function createBinder(handler: AudioEventHandler): IAudioBinder {
  /**
   * Listener WeakMap
   *
   * AudioElement -> ListenerMap
   */
  const listeners = new WeakMap<HTMLAudioElement, AudioListenerMap>()

  /**
   * 创建当前 Slot 的全部 Listener
   */
  function createListeners(slot: AudioSlot): AudioListenerMap {
    return {
      loadstart(event) {
        handler.onLoadStart?.(slot, event)
      },

      loadedmetadata(event) {
        handler.onLoadedMetadata?.(slot, event)
      },

      canplay(event) {
        handler.onCanPlay?.(slot, event)
      },

      play(event) {
        handler.onPlay?.(slot, event)
      },

      pause(event) {
        handler.onPause?.(slot, event)
      },

      timeupdate(event) {
        handler.onTimeUpdate?.(slot, event)
      },

      waiting(event) {
        handler.onWaiting?.(slot, event)
      },

      seeking(event) {
        handler.onSeeking?.(slot, event)
      },

      seeked(event) {
        handler.onSeeked?.(slot, event)
      },

      ended(event) {
        handler.onEnded?.(slot, event)
      },

      error(event) {
        handler.onError?.(slot, event)
      },
    }
  }

  /**
   * 绑定 Audio Event
   */
  function bind(slot: AudioSlot): void {
    const audio = slot.audio

    /**
     * 防止重复绑定
     */
    if (listeners.has(audio)) {
      return
    }

    const map = createListeners(slot)

    listeners.set(audio, map)

    audio.addEventListener('loadstart', map.loadstart)
    audio.addEventListener('loadedmetadata', map.loadedmetadata)
    audio.addEventListener('canplay', map.canplay)

    audio.addEventListener('play', map.play)
    audio.addEventListener('pause', map.pause)

    audio.addEventListener('timeupdate', map.timeupdate)

    audio.addEventListener('waiting', map.waiting)

    audio.addEventListener('seeking', map.seeking)
    audio.addEventListener('seeked', map.seeked)

    audio.addEventListener('ended', map.ended)

    audio.addEventListener('error', map.error)

  }

  /**
   * 解绑 Audio Event
   */
  function unbind(
    slot: AudioSlot,
  ): void {

    const audio = slot.audio

    const map = listeners.get(audio)

    if (!map) {
      return
    }

    audio.removeEventListener('loadstart', map.loadstart)
    audio.removeEventListener('loadedmetadata', map.loadedmetadata)
    audio.removeEventListener('canplay', map.canplay)

    audio.removeEventListener('play', map.play)
    audio.removeEventListener('pause', map.pause)

    audio.removeEventListener('timeupdate', map.timeupdate)

    audio.removeEventListener('waiting', map.waiting)

    audio.removeEventListener('seeking', map.seeking)
    audio.removeEventListener('seeked', map.seeked)

    audio.removeEventListener('ended', map.ended)

    audio.removeEventListener('error', map.error)

    listeners.delete(audio)

  }

    /**
   * 已绑定的 AudioSlot
   *
   * destroy() 时统一释放。
   */
  const boundSlots = new Set<AudioSlot>()

  /**
   * 重置 Audio
   *
   * 注意：
   * 这里只处理 HTMLAudioElement 生命周期，
   * 不修改 Engine State。
   */
  function reset(slot: AudioSlot): void {

    const audio = slot.audio

    // 停止播放
    audio.pause()

    // 清空资源
    audio.removeAttribute('src')

    // 释放浏览器资源
    audio.load()

    // 中止可能存在的异步任务
    slot.abortController?.abort()
    slot.abortController = null

    // 清理播放 Promise
    slot.playPromise = null

  }

  /**
   * 销毁 Binder
   */
  function destroy(): void {

    for (const slot of boundSlots) {

      unbind(slot)

      reset(slot)

    }

    boundSlots.clear()

  }

  /**
   * 包装 bind()
   *
   * 自动维护 boundSlots。
   */
  function bindSlot(slot: AudioSlot): void {

    bind(slot)

    boundSlots.add(slot)

  }

  /**
   * 包装 unbind()
   *
   * 自动维护 boundSlots。
   */
  function unbindSlot(slot: AudioSlot): void {

    unbind(slot)

    boundSlots.delete(slot)

  }

  return {
    bind: bindSlot,
    unbind: unbindSlot,
    reset,
    destroy,
  }
}