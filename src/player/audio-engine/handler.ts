/**
 * Audio Engine — Handler
 *
 * Binds native HTMLAudioElement events to EngineEvent emissions.
 * Each handler translates a raw DOM event into a typed EngineEvent.
 * Returns a dispose() function to clean up all listeners.
 */

import type { AudioSlotId } from './types'
import type { EngineEventBus } from './events'

/** Map of native audio event names to the handler logic that emits EngineEvents */
type AudioEventListener = () => void

export interface AudioHandler {
  /** The slot ID this handler is bound to */
  slotId: AudioSlotId
  /** Remove all event listeners from the audio element */
  dispose(): void
}

/**
 * Create an audio handler that bridges native audio events to the EngineEventBus.
 *
 * @param audio - The HTMLAudioElement to observe
 * @param slotId - Which slot this audio belongs to
 * @param bus - The EngineEventBus to emit events to
 */
export function createAudioHandler(
  audio: HTMLAudioElement,
  slotId: AudioSlotId,
  bus: EngineEventBus,
): AudioHandler {
  const now = () => Date.now()

  const eventMap: Record<string, AudioEventListener> = {
    playing: () => bus.emit({ type: 'playing', slotId, timestamp: now() }),
    pause: () => bus.emit({ type: 'paused', slotId, timestamp: now() }),
    ended: () => bus.emit({ type: 'ended', slotId, timestamp: now() }),
    timeupdate: () =>
      bus.emit({
        type: 'timeupdate',
        slotId,
        timestamp: now(),
        currentTime: audio.currentTime,
        duration: audio.duration,
      }),
    durationchange: () =>
      bus.emit({
        type: 'durationchange',
        slotId,
        timestamp: now(),
        duration: audio.duration,
      }),
    loadedmetadata: () =>
      bus.emit({
        type: 'loadedmetadata',
        slotId,
        timestamp: now(),
        duration: audio.duration,
      }),
    canplay: () => bus.emit({ type: 'canplay', slotId, timestamp: now() }),
    seeking: () => bus.emit({ type: 'seeking', slotId, timestamp: now() }),
    seeked: () => bus.emit({ type: 'seeked', slotId, timestamp: now() }),
    error: () => {
      const err = audio.error
      bus.emit({
        type: 'error',
        slotId,
        timestamp: now(),
        errorCode: err?.code ?? null,
        errorMessage: err?.message ?? null,
      })
    },
    stalled: () => bus.emit({ type: 'stalled', slotId, timestamp: now() }),
    waiting: () => bus.emit({ type: 'waiting', slotId, timestamp: now() }),
  }

  // Attach all listeners
  for (const [event, listener] of Object.entries(eventMap)) {
    audio.addEventListener(event, listener)
  }

  return {
    slotId,
    dispose() {
      for (const [event, listener] of Object.entries(eventMap)) {
        audio.removeEventListener(event, listener)
      }
    },
  }
}
