/**
 * Audio Engine — Interfaces
 *
 * Defines the public API surface of the Engine.
 * Controllers interact with the Engine through these interfaces.
 */

import type { AudioSlot, AudioSlotId, SlotState } from './types'
import type { EngineEventBus } from './events'

/** Public actions exposed by the Engine */
export interface EngineActions {
  /** Load an audio source on a specific slot (queued, interruptible) */
  loadOnSlot(slotId: AudioSlotId, src: string, trackId: number | null): Promise<void>

  /** Play a specific slot (queued, interruptible) */
  playSlot(slotId: AudioSlotId): Promise<void>

  /** Pause a specific slot (immediate, not queued) */
  pauseSlot(slotId: AudioSlotId): void

  /** Seek to a specific time on a slot (immediate, not queued) */
  seekSlot(slotId: AudioSlotId, time: number): void

  /** Set playback rate on a slot */
  setPlaybackRate(slotId: AudioSlotId, rate: number): void

  /** Prepare the standby slot with a source (for preloading) */
  prepareStandby(src: string, trackId: number | null): Promise<void>

  /** Swap active and standby slot roles */
  swapSlots(): void
}

/** Read-only engine state queries */
export interface EngineQueries {
  /** Get the active slot */
  getActiveSlot(): AudioSlot | null

  /** Get the standby slot */
  getStandbySlot(): AudioSlot | null

  /** Get a slot by ID */
  getSlot(slotId: AudioSlotId): AudioSlot | null

  /** Get state of a specific slot */
  getSlotState(slotId: AudioSlotId): SlotState

  /** Get current time of the active slot */
  getActiveCurrentTime(): number

  /** Get duration of the active slot */
  getActiveDuration(): number

  /** Check if active slot is playing */
  isActivePlaying(): boolean
}

/** Complete Engine interface = Actions + Queries + Events + Lifecycle */
export interface Engine extends EngineActions, EngineQueries {
  /** The engine event bus for listening to runtime events */
  readonly events: EngineEventBus

  /** Dispose all resources, handlers, and clean up */
  dispose(): void
}
