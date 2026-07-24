/**
 * Audio Engine — Binder
 *
 * Manages the creation and binding of two AudioSlots.
 * Each slot wraps an HTMLAudioElement with its handler.
 * Tracks which slot is "active" (currently playing) vs "standby".
 */

import type { AudioSlot, AudioSlotId } from './types'
import type { EngineEventBus } from './events'
import { createAudioHandler, type AudioHandler } from './handler'

export interface Binder {
  /** Bind two audio elements to slots A and B */
  bind(audioA: HTMLAudioElement, audioB: HTMLAudioElement): void

  /** Unbind all handlers and reset slots */
  unbind(): void

  /** Get a slot by ID */
  getSlot(slotId: AudioSlotId): AudioSlot | null

  /** Get the active slot */
  getActiveSlot(): AudioSlot | null

  /** Get the standby slot */
  getStandbySlot(): AudioSlot | null

  /** Get the active slot ID */
  getActiveSlotId(): AudioSlotId

  /** Swap active and standby roles (does NOT move audio elements, just swaps IDs) */
  swapActiveStandby(): void

  /** Update a slot's state */
  setSlotState(slotId: AudioSlotId, state: AudioSlot['state']): void

  /** Update a slot's track ID and src */
  setSlotTrack(slotId: AudioSlotId, trackId: number | null, src: string | null): void
}

/**
 * Create a Binder that manages two AudioSlots.
 *
 * @param bus - The EngineEventBus to pass to handlers
 */
export function createBinder(bus: EngineEventBus): Binder {
  const slots = new Map<AudioSlotId, AudioSlot>()
  const handlers = new Map<AudioSlotId, AudioHandler>()
  let activeSlotId: AudioSlotId = 'A'

  function bind(audioA: HTMLAudioElement, audioB: HTMLAudioElement) {
    unbind()

    const slotA: AudioSlot = { id: 'A', audio: audioA, state: 'idle', trackId: null, src: null }
    const slotB: AudioSlot = { id: 'B', audio: audioB, state: 'idle', trackId: null, src: null }

    slots.set('A', slotA)
    slots.set('B', slotB)

    handlers.set('A', createAudioHandler(audioA, 'A', bus))
    handlers.set('B', createAudioHandler(audioB, 'B', bus))
  }

  function unbind() {
    for (const handler of handlers.values()) {
      handler.dispose()
    }
    handlers.clear()
    slots.clear()
    activeSlotId = 'A'
  }

  return {
    bind,
    unbind,

    getSlot(slotId: AudioSlotId): AudioSlot | null {
      return slots.get(slotId) ?? null
    },

    getActiveSlot(): AudioSlot | null {
      return slots.get(activeSlotId) ?? null
    },

    getStandbySlot(): AudioSlot | null {
      const standbyId: AudioSlotId = activeSlotId === 'A' ? 'B' : 'A'
      return slots.get(standbyId) ?? null
    },

    getActiveSlotId(): AudioSlotId {
      return activeSlotId
    },

    swapActiveStandby() {
      activeSlotId = activeSlotId === 'A' ? 'B' : 'A'
    },

    setSlotState(slotId: AudioSlotId, state: AudioSlot['state']) {
      const slot = slots.get(slotId)
      if (slot) slot.state = state
    },

    setSlotTrack(slotId: AudioSlotId, trackId: number | null, src: string | null) {
      const slot = slots.get(slotId)
      if (slot) {
        slot.trackId = trackId
        slot.src = src
      }
    },
  }
}
