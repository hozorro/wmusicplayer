/**
 * Player Engine 2.0
 * Strong Typed Event Bus
 */

import type { PlayerTrack } from '../types'

/* -------------------------------------------------------------------------- */
/* Events                                                                     */
/* -------------------------------------------------------------------------- */

export const EngineEvent = {
    Ready: 'ready',
    Play: 'play',
    Pause: 'pause',
    Stop: 'stop',
    TimeUpdate: 'timeUpdate',
    Ending: 'ending',
    Ended: 'ended',
    Waiting: 'waiting',
    CanPlay: 'canplay',
    Error: 'error',
    Destroy: 'destroy',
} as const

export type EngineEvent = (typeof EngineEvent)[keyof typeof EngineEvent]

/* -------------------------------------------------------------------------- */
/* Payload                                                                    */
/* -------------------------------------------------------------------------- */

export interface EngineEventMap {
    ready: void
    play: {
        track: PlayerTrack
    }
    pause: {
        track: PlayerTrack
        currentTime: number
    }
    stop: void
    timeUpdate: {
        currentTime: number
        duration: number
    }
    ending: {
        track: PlayerTrack
    }
    ended: {
        track: PlayerTrack
    }
    waiting: void
    canplay: void
    error: {
        error: unknown
        track?: PlayerTrack
    }
    destroy: void
}

/* -------------------------------------------------------------------------- */
/* Event Handler                                                              */
/* -------------------------------------------------------------------------- */

export type EngineEventHandler<T extends keyof EngineEventMap> = (payload: EngineEventMap[T]) => void

/* -------------------------------------------------------------------------- */
/* Event Bus                                                                  */
/* -------------------------------------------------------------------------- */

export class EngineEventBus {
    private readonly listeners = new Map<keyof EngineEventMap, Set<EngineEventHandler<any>>>()

    on<T extends keyof EngineEventMap>(event: T, handler: EngineEventHandler<T>): () => void {
        let handlers = this.listeners.get(event)

        if (!handlers) {
            handlers = new Set()
            this.listeners.set(event, handlers)
        }

        handlers.add(handler)

        return () => this.off(event, handler)
    }

    once<T extends keyof EngineEventMap>(event: T, handler: EngineEventHandler<T>): () => void {
        const wrapper: EngineEventHandler<T> = (payload) => {
            this.off(event, wrapper)
            handler(payload)
        }

        return this.on(event, wrapper)
    }

    off<T extends keyof EngineEventMap>(event: T, handler: EngineEventHandler<T>): void {
        this.listeners.get(event)?.delete(handler)
    }

    emit<T extends keyof EngineEventMap>(event: T, payload: EngineEventMap[T]): void {
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