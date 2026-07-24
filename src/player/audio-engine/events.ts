/**
 * Audio Engine — Event Bus
 *
 * Lightweight typed event bus for engine runtime events.
 * Only describes audio runtime state, no business semantics.
 */

import type { EngineEvent, EngineEventType, EngineEventHandler } from './types'

export interface EngineEventBus {
  /** Emit an engine event */
  emit(event: EngineEvent): void

  /** Subscribe to a specific engine event type */
  on<T extends EngineEvent>(type: T['type'], handler: EngineEventHandler<T>): void

  /** Unsubscribe from a specific engine event type */
  off<T extends EngineEvent>(type: T['type'], handler: EngineEventHandler<T>): void

  /** Subscribe once — automatically unsubscribes after first invocation */
  once<T extends EngineEvent>(type: T['type'], handler: EngineEventHandler<T>): void

  /** Remove all listeners, optionally for a specific event type only */
  removeAll(type?: EngineEventType): void
}

/**
 * Create an EngineEventBus instance.
 * Uses a Map of Sets for O(1) emit and O(1) add/remove.
 */
export function createEngineEventBus(): EngineEventBus {
  const listeners = new Map<EngineEventType, Set<EngineEventHandler<any>>>()

  function getSet(type: EngineEventType): Set<EngineEventHandler<any>> {
    let set = listeners.get(type)
    if (!set) {
      set = new Set()
      listeners.set(type, set)
    }
    return set
  }

  function emit(event: EngineEvent) {
    const set = listeners.get(event.type)
    if (!set) return
    for (const handler of set) {
      handler(event)
    }
  }

  function on<T extends EngineEvent>(type: T['type'], handler: EngineEventHandler<T>) {
    getSet(type).add(handler)
  }

  function off<T extends EngineEvent>(type: T['type'], handler: EngineEventHandler<T>) {
    const set = listeners.get(type)
    if (set) {
      set.delete(handler)
      if (set.size === 0) listeners.delete(type)
    }
  }

  function once<T extends EngineEvent>(type: T['type'], handler: EngineEventHandler<T>) {
    const wrapper: EngineEventHandler<T> = (event) => {
      off(type, wrapper)
      handler(event)
    }
    on(type, wrapper)
  }

  function removeAll(type?: EngineEventType) {
    if (type) {
      listeners.delete(type)
    } else {
      listeners.clear()
    }
  }

  return { emit, on, off, once, removeAll }
}
