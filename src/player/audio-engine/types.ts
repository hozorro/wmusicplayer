/**
 * Audio Engine — Core Types
 *
 * Defines the fundamental types for the dual-slot audio engine.
 * Engine only describes runtime state, no business semantics.
 */

/** Slot identifier for the two HTMLAudioElement instances */
export type AudioSlotId = 'A' | 'B'

/** Lifecycle state of a single audio slot */
export type SlotState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error'

/** Represents one audio slot wrapping an HTMLAudioElement */
export interface AudioSlot {
  id: AudioSlotId
  audio: HTMLAudioElement
  state: SlotState
  trackId: number | null
  src: string | null
}

/** Engine event types — only describe audio runtime state */
export type EngineEventType =
  | 'playing'
  | 'paused'
  | 'ended'
  | 'timeupdate'
  | 'durationchange'
  | 'loadedmetadata'
  | 'canplay'
  | 'seeking'
  | 'seeked'
  | 'error'
  | 'stalled'
  | 'waiting'

/** Base engine event payload */
export interface EngineEventBase {
  type: EngineEventType
  slotId: AudioSlotId
  timestamp: number
}

export interface EnginePlayingEvent extends EngineEventBase {
  type: 'playing'
}
export interface EnginePausedEvent extends EngineEventBase {
  type: 'paused'
}
export interface EngineEndedEvent extends EngineEventBase {
  type: 'ended'
}
export interface EngineTimeUpdateEvent extends EngineEventBase {
  type: 'timeupdate'
  currentTime: number
  duration: number
}
export interface EngineDurationChangeEvent extends EngineEventBase {
  type: 'durationchange'
  duration: number
}
export interface EngineLoadedMetadataEvent extends EngineEventBase {
  type: 'loadedmetadata'
  duration: number
}
export interface EngineCanplayEvent extends EngineEventBase {
  type: 'canplay'
}
export interface EngineSeekingEvent extends EngineEventBase {
  type: 'seeking'
}
export interface EngineSeekedEvent extends EngineEventBase {
  type: 'seeked'
}
export interface EngineErrorEvent extends EngineEventBase {
  type: 'error'
  errorCode: number | null
  errorMessage: string | null
}
export interface EngineStalledEvent extends EngineEventBase {
  type: 'stalled'
}
export interface EngineWaitingEvent extends EngineEventBase {
  type: 'waiting'
}

/** Union of all engine events */
export type EngineEvent =
  | EnginePlayingEvent
  | EnginePausedEvent
  | EngineEndedEvent
  | EngineTimeUpdateEvent
  | EngineDurationChangeEvent
  | EngineLoadedMetadataEvent
  | EngineCanplayEvent
  | EngineSeekingEvent
  | EngineSeekedEvent
  | EngineErrorEvent
  | EngineStalledEvent
  | EngineWaitingEvent

/** Handler function for engine events */
export type EngineEventHandler<T extends EngineEvent = EngineEvent> = (event: T) => void
