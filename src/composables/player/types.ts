/**
 * Player Engine 2.0
 * Shared type definitions
 */

import type {
  EngineState,
  PreloadState,
  TransitionState,
} from './state'
import type { AudioSlot } from './audio-engine/types'


/* -------------------------------------------------------------------------- */
/* Basic Types                                                                */
/* -------------------------------------------------------------------------- */

export type AudioSlotId = 'A' | 'B'

export interface ArtistInfo {
  id: number
  name: string
}

export interface AlbumInfo {
  id: number
  name: string
}

/* -------------------------------------------------------------------------- */
/* Track                                                                      */
/* -------------------------------------------------------------------------- */

export interface PlayerTrack {
  id: number
  title: string
  duration: number
  artists?: ArtistInfo[]
  album?: AlbumInfo
  cover?: string
  // Streaming url
  url?: string
  // Blob url from preload cache
  blobUrl?: string
  favorited_at?: string
}

/* -------------------------------------------------------------------------- */
/* Runtime State                                                              */
/* -------------------------------------------------------------------------- */

export interface EngineRuntimeState {
  engine: EngineState
  transition: TransitionState
  preload: PreloadState
}

/* -------------------------------------------------------------------------- */
/* MediaSession                                                               */
/* -------------------------------------------------------------------------- */

export interface PlayerArtwork {
  src: string
  sizes?: string
  type?: string
}

export interface PlayerMetadata {
  title: string
  artist: string
  album: string
  artwork: PlayerArtwork[]
}

/* -------------------------------------------------------------------------- */
/* Transition                                                                 */
/* -------------------------------------------------------------------------- */

export interface TransitionContext {
  from: AudioSlot
  to: AudioSlot
  startTime: number
  reason: 'manual' | 'auto' | 'ended'
}

/* -------------------------------------------------------------------------- */
/* Audio Command                                                              */
/* -------------------------------------------------------------------------- */

export const CommandType = {
  Play: 'play',
  Pause: 'pause',
  Stop: 'stop',
  Load: 'load',
  Preload: 'preload',
  Transition: 'transition',
  Swap: 'swap',
  Destroy: 'destroy',
} as const

export type CommandType = (typeof CommandType)[keyof typeof CommandType]

export interface AudioCommand {
  type: CommandType
  slot?: AudioSlot
  track?: PlayerTrack
  payload?: unknown
}

/* -------------------------------------------------------------------------- */
/* Play Mode                                                                  */
/* -------------------------------------------------------------------------- */

export const PlayMode = {
  Sequential: 'sequential',
  Random: 'random',
  SingleLoop: 'singleLoop',
} as const

export type PlayMode = (typeof PlayMode)[keyof typeof PlayMode]

/* -------------------------------------------------------------------------- */
/* Player                                                                     */
/* -------------------------------------------------------------------------- */

