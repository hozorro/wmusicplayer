/**
 * Player Engine 2.0
 * Runtime states
 */

/* -------------------------------------------------------------------------- */
/* Engine                                                                      */
/* -------------------------------------------------------------------------- */

export const EngineState = {
  Idle: 'idle',
  Initializing: 'initializing',
  Loading: 'loading',
  Buffering: 'buffering',
  Ready: 'ready',
  Playing: 'playing',
  Paused: 'paused',
  Ended: 'ended',
  Transition: 'transition',
  Destroyed: 'destroyed',
  Error: 'error',
} as const

export type EngineState = (typeof EngineState)[keyof typeof EngineState]

/* -------------------------------------------------------------------------- */
/* Audio                                                                       */
/* -------------------------------------------------------------------------- */

export const AudioState = {
  Empty: 'empty',
  Loading: 'loading',
  Ready: 'ready',
  Playing: 'playing',
  Paused: 'paused',
  Ended: 'ended',
  Error: 'error',
} as const

export type AudioState = (typeof AudioState)[keyof typeof AudioState]

/* -------------------------------------------------------------------------- */
/* Transition                                                                  */
/* -------------------------------------------------------------------------- */

export const TransitionState = {
  Idle: 'idle',
  Waiting: 'waiting',
  Switching: 'switching',
  Rollback: 'rollback',
  Failed: 'failed',
} as const

export type TransitionState = (typeof TransitionState)[keyof typeof TransitionState]

/* -------------------------------------------------------------------------- */
/* Preload                                                                     */
/* -------------------------------------------------------------------------- */

export const PreloadState = {
  None: 'none',
  Loading: 'loading',
  Cached: 'cached',
  Failed: 'failed',
} as const

export type PreloadState = (typeof PreloadState)[keyof typeof PreloadState]