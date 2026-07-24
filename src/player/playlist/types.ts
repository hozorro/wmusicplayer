/**
 * Playlist Model — Types
 */

import type { PlayChangeMode } from '@/constants/play-constants'

/** Sequence mode for playback order */
export type { SeqMode } from '@/constants/play-constants'

/** Result of a navigation operation (next/prev) */
export interface NavResult {
  /** The playlist index to play next */
  index: number
  /** Whether the navigation wrapped around (looped) */
  wrapped: boolean
}

/** Playlist change event payload */
export interface PlaylistChangeEvent {
  mode: PlayChangeMode
  /** New tracks being added (if applicable) */
  tracks?: Track[]
}
