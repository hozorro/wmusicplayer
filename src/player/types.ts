/**
 * Player — Types
 *
 * Public types for the Player Facade and Controller interfaces.
 */

import type { Ref } from 'vue'
import type { PlayerState } from './state'

// --- Controller Interface ---

/** Base interface for all controllers */
export interface Controller {
  /** Initialize the controller (subscribe to events, set up state) */
  init(): void
  /** Dispose the controller (unsubscribe, clean up timers, etc.) */
  dispose(): void
}

// --- Player Facade Interface ---

/**
 * The public API surface of the Player.
 * PlayerBox.vue (and only PlayerBox.vue) consumes this interface.
 */
export interface PlayerFacade {
  // --- State (reactive) ---
  state: PlayerState

  // --- Playback Actions ---
  /** Toggle play/pause */
  togglePlay(): void
  /** Start or resume playback */
  play(): Promise<void>
  /** Pause playback */
  pause(): void
  /** Skip to next track */
  playNext(): void
  /** Skip to previous track */
  playPrev(): void
  /** Seek to a specific time (seconds) */
  seek(time: number): void

  // --- Track Switch ---
  /** Switch to a specific track. directChange=true when clicking in playlist. */
  switchPlay(directChange?: boolean): void
  /** Handle track ended event (auto-next or loop) */
  playEnded(): void

  // --- Playlist Actions ---
  /** Handle playlist change from store */
  handlePlaylistChange(): void
  /** Remove a track from the current playlist */
  playRemove(id: number): void
  /** Click on a playlist item to play it */
  playlistItemClick(index: number, callback: () => void): void

  // --- Sequence Mode ---
  /** Cycle through sequence modes */
  handleOrder(): void

  // --- Time Update ---
  /** Handle time update from audio element (delegated by PlayerBox) */
  handleTimeUpdate(callback?: () => void): void

  // --- Favorites ---
  /** Toggle favorite for current track */
  handleFav(): Promise<void>
  /** Fetch artists favorite status */
  fetchArtistsFavStatus(): Promise<void>
  /** Handle artist favorite button click */
  handleArtistFavs(): void
  /** Handle artist favorite selection from dropdown */
  handleArtistFavSelected(artistId: number): void

  // --- Hits ---
  /** Load hits info for display */
  loadHitsInfo(trackId: number): void

  // --- Lyric ---
  /** Set a lyric line DOM ref */
  setLyricLineRef(el: HTMLElement | null, index: number): void

  // --- Computed-like accessors ---
  /** Current playlist tracks */
  audioList: Ref<Track[]>
}
