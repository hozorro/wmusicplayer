/**
 * Player Engine 2.0
 * Runtime constants
 */

import type { EngineOptions } from './audio-engine/types'

/* -------------------------------------------------------------------------- */
/* Engine                                                                      */
/* -------------------------------------------------------------------------- */

export const AUDIO_SLOT_COUNT = 2
export const DEFAULT_ACTIVE_SLOT = 'A' as const

/* -------------------------------------------------------------------------- */
/* Transition                                                                  */
/* -------------------------------------------------------------------------- */

export const DEFAULT_TRANSITION_THRESHOLD = 500
export const MIN_TRANSITION_THRESHOLD = 200
export const MAX_TRANSITION_THRESHOLD = 1000
export const TRANSITION_MONITOR_WINDOW = 2000

/* -------------------------------------------------------------------------- */
/* Fade                                                                        */
/* -------------------------------------------------------------------------- */

export const DEFAULT_FADE_DURATION = 300
export const MIN_FADE_DURATION = 50
export const MAX_FADE_DURATION = 5000

/* -------------------------------------------------------------------------- */
/* Preload                                                                     */
/* -------------------------------------------------------------------------- */

export const DEFAULT_PRELOAD_DELAY = 3000
export const PRELOAD_TIMEOUT = 30000

/* -------------------------------------------------------------------------- */
/* Playback                                                                    */
/* -------------------------------------------------------------------------- */

export const DEFAULT_PLAY_TIMEOUT = 10000
export const PLAY_RETRY_COUNT = 3
export const PLAY_RETRY_DELAY = 300

/* -------------------------------------------------------------------------- */
/* Queue                                                                       */
/* -------------------------------------------------------------------------- */

export const COMMAND_QUEUE_LIMIT = 64

/* -------------------------------------------------------------------------- */
/* iOS                                                                         */
/* -------------------------------------------------------------------------- */

export const IOS_RESUME_DELAY = 100
export const IOS_BACKGROUND_TIMER = 1000
export const IOS_ACTIVATE_TIMEOUT = 5000

/* -------------------------------------------------------------------------- */
/* Visibility                                                                  */
/* -------------------------------------------------------------------------- */

export const VISIBILITY_DEBOUNCE = 100

/* -------------------------------------------------------------------------- */
/* Network                                                                     */
/* -------------------------------------------------------------------------- */

export const NETWORK_RETRY_DELAY = 2000

/* -------------------------------------------------------------------------- */
/* Default Engine Options                                                      */
/* -------------------------------------------------------------------------- */

export const DEFAULT_ENGINE_OPTIONS: Readonly<EngineOptions> = {
  transitionThreshold: DEFAULT_TRANSITION_THRESHOLD,
  transitionMonitorWindow: TRANSITION_MONITOR_WINDOW,
  preload: true,
  gapless: true,
  crossFade: false,
  fadeDuration: DEFAULT_FADE_DURATION,
  playTimeout: DEFAULT_PLAY_TIMEOUT,
}