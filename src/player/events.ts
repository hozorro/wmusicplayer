/**
 * Player — Event Bus
 *
 * Business event bus for player-level events.
 * PlayerEvents describe user/business behavior, NOT audio runtime state.
 * Controllers bridge EngineEvents (runtime) to PlayerEvents (business).
 */

import type { SeqMode } from '@/constants/play-constants'

// --- Player Event Types ---

export interface TrackChangedEvent {
  type: 'track-changed'
  trackId: number
  timestamp: number
}

export interface TrackInfoUpdatedEvent {
  type: 'track-info-updated'
  track: TrackInfo
  timestamp: number
}

export interface PlayModeChangedEvent {
  type: 'play-mode-changed'
  mode: SeqMode
  timestamp: number
}

export interface PlaylistChangedEvent {
  type: 'playlist-changed'
  timestamp: number
}

export interface LyricUpdatedEvent {
  type: 'lyric-updated'
  lyricIndex: number
  timestamp: number
}

export interface PlayerErrorEvent {
  type: 'error'
  message: string
  timestamp: number
}

export interface FavToggledEvent {
  type: 'fav-toggled'
  trackId: number
  favorited: boolean
  timestamp: number
}

/** Union of all player events */
export type PlayerEvent =
  | TrackChangedEvent
  | TrackInfoUpdatedEvent
  | PlayModeChangedEvent
  | PlaylistChangedEvent
  | LyricUpdatedEvent
  | PlayerErrorEvent
  | FavToggledEvent

export type PlayerEventType = PlayerEvent['type']
export type PlayerEventHandler<T extends PlayerEvent = PlayerEvent> = (event: T) => void

// --- Event Bus Interface & Factory ---

export interface PlayerEventBus {
  emit(event: PlayerEvent): void
  on<T extends PlayerEvent>(type: T['type'], handler: PlayerEventHandler<T>): void
  off<T extends PlayerEvent>(type: T['type'], handler: PlayerEventHandler<T>): void
  once<T extends PlayerEvent>(type: T['type'], handler: PlayerEventHandler<T>): void
  removeAll(type?: PlayerEventType): void
}

export function createPlayerEventBus(): PlayerEventBus {
  const listeners = new Map<PlayerEventType, Set<PlayerEventHandler<any>>>()

  function getSet(type: PlayerEventType): Set<PlayerEventHandler<any>> {
    let set = listeners.get(type)
    if (!set) {
      set = new Set()
      listeners.set(type, set)
    }
    return set
  }

  function emit(event: PlayerEvent) {
    const set = listeners.get(event.type)
    if (!set) return
    for (const handler of set) {
      handler(event)
    }
  }

  function on<T extends PlayerEvent>(type: T['type'], handler: PlayerEventHandler<T>) {
    getSet(type).add(handler)
  }

  function off<T extends PlayerEvent>(type: T['type'], handler: PlayerEventHandler<T>) {
    const set = listeners.get(type)
    if (set) {
      set.delete(handler)
      if (set.size === 0) listeners.delete(type)
    }
  }

  function once<T extends PlayerEvent>(type: T['type'], handler: PlayerEventHandler<T>) {
    const wrapper: PlayerEventHandler<T> = (event) => {
      off(type, wrapper)
      handler(event)
    }
    on(type, wrapper)
  }

  function removeAll(type?: PlayerEventType) {
    if (type) {
      listeners.delete(type)
    } else {
      listeners.clear()
    }
  }

  return { emit, on, off, once, removeAll }
}
