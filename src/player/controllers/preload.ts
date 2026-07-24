/**
 * Controller — Preload
 *
 * Manages audio preloading strategy.
 * Listens to engine timeupdate events and player track-changed events
 * to schedule preloading of the next track.
 */

import { useMusicStore } from '@/store/music'
import { SeqMode } from '@/constants/play-constants'
import { audioSource } from '../audio-engine/audio-source'
import type { Engine } from '../audio-engine/interfaces'
import type { EngineEventBus } from '../audio-engine/events'
import type { PlayerEventBus } from '../events'
import type { PlayerState } from '../state'
import type { Controller } from '../types'
import type { PlaylistController } from './playlist'

const PRELOAD_DELAY = 3000

export interface PreloadController extends Controller {
  /** Manually trigger preload for next track */
  preloadNext(): void
  /** Invalidate all preloaded tracks (except current) */
  invalidateAll(): void
}

interface PreloadControllerDeps {
  engine: Engine
  engineEvents: EngineEventBus
  playerEvents: PlayerEventBus
  state: PlayerState
  playlistController: PlaylistController
}

export function createPreloadController(deps: PreloadControllerDeps): PreloadController {
  const { engine, engineEvents, playerEvents, state, playlistController } = deps
  const store = useMusicStore()

  let preloadTimer: ReturnType<typeof setTimeout> | null = null
  let disposed = false

  function init() {
    // Listen to track-changed to schedule preload after switch
    playerEvents.on('track-changed', () => {
      if (disposed) return
      schedulePreload()
    })

    // Listen to playlist-changed to invalidate old preloads
    playerEvents.on('playlist-changed', () => {
      if (disposed) return
      invalidateAll()
    })

    // Listen to play-mode-changed to invalidate
    playerEvents.on('play-mode-changed', () => {
      if (disposed) return
      invalidateAll()
      schedulePreload()
    })

    // Listen to timeupdate for 80% progress preload (safety net)
    engineEvents.on('timeupdate', (e) => {
      if (disposed) return
      const activeSlot = engine.getActiveSlot()
      if (!activeSlot || e.slotId !== activeSlot.id) return

      const portion = (e as any).currentTime / (e as any).duration
      if (portion > 0.8) {
        const model = playlistController.getModel()
        const nextId = model.getNextTrackId(store.getParam('isLoop'))
        if (nextId && !audioSource.has(nextId)) {
          audioSource.preload(nextId)
        }
      }
    })
  }

  function schedulePreload(): void {
    if (preloadTimer) clearTimeout(preloadTimer)

    preloadTimer = setTimeout(() => {
      preloadTimer = null
      preloadNext()
    }, PRELOAD_DELAY)
  }

  function preloadNext(): void {
    const model = playlistController.getModel()
    if (model.mode === SeqMode.SINGLE_LOOP) return

    const nextId = model.getNextTrackId(store.getParam('isLoop'))
    if (!nextId || nextId === state.currentTrack.id) return

    // Check network conditions
    const conn = (navigator as any).connection
    if (conn && (conn.saveData || (conn.effectiveType && ['slow-2g', '2g'].includes(conn.effectiveType)))) {
      return
    }

    audioSource.preload(nextId)
  }

  function invalidateAll(): void {
    if (preloadTimer) {
      clearTimeout(preloadTimer)
      preloadTimer = null
    }
    const stats = audioSource.getStats()
    for (const id of stats.trackIds) {
      if (id !== state.currentTrack.id) {
        audioSource.invalidate(id)
      }
    }
  }

  function dispose() {
    disposed = true
    if (preloadTimer) {
      clearTimeout(preloadTimer)
      preloadTimer = null
    }
    audioSource.clearAll()
  }

  return {
    init,
    dispose,
    preloadNext,
    invalidateAll,
  }
}
