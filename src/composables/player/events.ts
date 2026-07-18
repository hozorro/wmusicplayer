/**
 * Player Engine 2.0
 * Player events
 */

import type { PlayerTrack, PlayMode, PlayerMetadata } from './types'

export const PlayerEvent = {
  TrackChanged: 'track:changed',
  PlaylistChanged: 'playlist:changed',
  PlayModeChanged: 'playmode:changed',
  MetadataChanged: 'metadata:changed',
} as const

export type PlayerEvent = typeof PlayerEvent[keyof typeof PlayerEvent]

/* -------------------------------------------------------------------------- */
/* Payload                                                                     */
/* -------------------------------------------------------------------------- */

export interface PlayerEventMap {
  'track:changed': {
    track: PlayerTrack
  }
  'playlist:changed': {
    current: number
    total: number
  }
  'playmode:changed': {
    mode: PlayMode
  }
  'metadata:changed': PlayerMetadata
}

/* -------------------------------------------------------------------------- */
/* Event Handler                                                              */
/* -------------------------------------------------------------------------- */

export type PlayerEventHandler<T extends keyof PlayerEventMap> = (payload: PlayerEventMap[T]) => void

/* -------------------------------------------------------------------------- */
/* Event Bus                                                                   */
/* -------------------------------------------------------------------------- */

export class PlayerEventBus {
  private readonly listeners = new Map<keyof PlayerEventMap, Set<PlayerEventHandler<any>>>()

  on<T extends keyof PlayerEventMap>(event: T, handler: PlayerEventHandler<T>): () => void {
    let handlers = this.listeners.get(event)

    if (!handlers) {
      handlers = new Set()
      this.listeners.set(event, handlers)
    }

    handlers.add(handler)

    return () => this.off(event, handler)
  }

  once<T extends keyof PlayerEventMap>(event: T, handler: PlayerEventHandler<T>): () => void {
    const wrapper: PlayerEventHandler<T> = (payload) => {
      this.off(event, wrapper)
      handler(payload)
    }

    return this.on(event, wrapper)
  }

  off<T extends keyof PlayerEventMap>(event: T, handler: PlayerEventHandler<T>): void {
    this.listeners.get(event)?.delete(handler)
  }

  emit<T extends keyof PlayerEventMap>(event: T, payload: PlayerEventMap[T]): void {
    const handlers = this.listeners.get(event)

    if (!handlers) return

    for (const handler of handlers) {
      handler(payload)
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}
