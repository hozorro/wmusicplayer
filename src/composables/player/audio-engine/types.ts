/**
 * Audio Engine 2.0
 * Internal Types
 */
import type { PlayerTrack } from '../types'
import type { EngineState } from '../state'

/* -------------------------------------------------------------------------- */
/* Slot                                                                       */
/* -------------------------------------------------------------------------- */

export type SlotId = 'A' | 'B'

/* -------------------------------------------------------------------------- */
/* Audio Slot                                                                 */
/* -------------------------------------------------------------------------- */

export const SlotStatus = {
  Empty: 'empty',
  Loading: 'loading',
  Ready: 'ready',
  Playing: 'playing',
  Error: 'error',
} as const
export type SlotStatus = (typeof SlotStatus)[keyof typeof SlotStatus]

export interface AudioSlot {
  readonly id: SlotId
  readonly audio: HTMLAudioElement
  // Current loaded track
  track: PlayerTrack | null
  // Last play promise
  playPromise: Promise<void> | null
  // Abort loading
  abortController: AbortController | null
  status: SlotStatus
}

/* -------------------------------------------------------------------------- */
/* Engine Config                                                              */
/* -------------------------------------------------------------------------- */

export interface EngineOptions {
  // Seconds before ending
  transitionThreshold: number
  transitionMonitorWindow: number
  // Enable preload
  preload: boolean
  // Enable gapless mode
  gapless: boolean
  // Enable cross fade
  crossFade: boolean
  // Fade duration
  fadeDuration: number
  // play() timeout
  playTimeout: number
}

/* -------------------------------------------------------------------------- */
/* Engine Context                                                             */
/* -------------------------------------------------------------------------- */

export interface EngineContext {
  initialized: boolean
  destroyed: boolean
  state: EngineState
  activeSlot: AudioSlot | null
  standbySlot: AudioSlot | null
  options: Readonly<EngineOptions>
}

/* -------------------------------------------------------------------------- */
/*  Result                                                                    */
/* -------------------------------------------------------------------------- */

export interface EngineResult {
  slot: AudioSlot
  elapsed: number
}

export interface LoadResult extends EngineResult {
  cached: boolean
  success: boolean
}

export interface PlayResult extends EngineResult {
  resumed: boolean
}

export interface TransitionResult {
  success: boolean
  elapsed: number
  previous: AudioSlot
  current: AudioSlot
}