/**
 * Controller — Transition
 *
 * Manages the dual-slot track switching flow.
 * This is the ONLY controller that coordinates audio-source with engine actions.
 *
 * Flow:
 * 1. Receive switch command with trackId
 * 2. Resolve audio source (cache-first via audio-source)
 * 3. Load on standby slot -> play -> swap active/standby -> pause old slot
 * 4. Handle error recovery (consecutive errors -> auto-skip)
 */

import { useMusicStore } from '@/store/music'
import { getTrackInfo, getStreamingUrl } from '@/apis/methods/music'
import { audioSource } from '../audio-engine/audio-source'
import type { Engine } from '../audio-engine/interfaces'
import type { EngineEventBus } from '../audio-engine/events'
import type { PlayerEventBus } from '../events'
import type { PlayerState } from '../state'
import type { Controller } from '../types'
import type { PlaylistController } from './playlist'
import WMessage from '@/composables/message'

export interface TransitionController extends Controller {
  /** Switch to a specific track by ID */
  switchTo(trackId: number): Promise<void>
  /** Get the current track ID being managed */
  getCurrentTrackId(): number
}

interface TransitionControllerDeps {
  engine: Engine
  engineEvents: EngineEventBus
  playerEvents: PlayerEventBus
  state: PlayerState
  playlistController: PlaylistController
  /** Callback after successful switch (e.g., for color effect refresh) */
  onSwitchComplete: () => void
}

export function createTransitionController(deps: TransitionControllerDeps): TransitionController {
  const { engine, engineEvents, playerEvents, state, playlistController, onSwitchComplete } = deps
  const store = useMusicStore()

  let consecutiveErrors = 0
  let currentTrackId = 0
  let disposed = false

  function init() {
    // Listen for engine errors to track consecutive failures
    engineEvents.on('error', (e) => {
      if (disposed) return
      // Only count errors from the active slot
      const activeSlot = engine.getActiveSlot()
      if (activeSlot && e.slotId === activeSlot.id) {
        consecutiveErrors += 1
        if (store.getParam('isAutoPlayNext') && consecutiveErrors < store.getParam('max_fail_count')) {
          setTimeout(() => {
            playlistController.next()
          }, store.getParam('switch_time'))
        }
        if (consecutiveErrors >= 10) {
          consecutiveErrors = 0
        }
      }
    })

    // Listen for successful play to reset error counter
    engineEvents.on('playing', () => {
      consecutiveErrors = 0
    })
  }

  async function switchTo(trackId: number): Promise<void> {
    if (disposed) return
    currentTrackId = trackId
    state.isLoading.value = true

    try {
      // 1. Fetch track info (parallel with source resolution)
      const trackInfoPromise = getTrackInfo(trackId)

      // 2. Resolve audio source (cache-first)
      let src = await audioSource.getCachedUrl(trackId)
      if (!src) {
        const streamUrl = await getStreamingUrl(trackId)
        src = `/api/${streamUrl}`
      }

      // 3. Get track info and update state
      const data = await trackInfoPromise
      state.currentTrack.id = trackId
      state.currentTrack.title = data.title
      state.currentTrack.artists = data.artists
      state.currentTrack.album = data.album
      state.currentTrack.duration = data.duration
      state.currentTrack.favorited_at = data.favorited_at
      state.currentTrack.cover = `/media/tracks/${trackId}.jpg?v=${data.cover_art_hash || 'default'}`

      // 4. Pause current active slot
      const activeSlot = engine.getActiveSlot()
      if (activeSlot) {
        engine.pauseSlot(activeSlot.id)
      }

      // 5. Load and play on standby slot
      const standby = engine.getStandbySlot()
      if (!standby) {
        throw new Error('No standby slot available')
      }

      await engine.loadOnSlot(standby.id, src, trackId)
      await engine.playSlot(standby.id)

      // 6. Swap active/standby
      engine.swapSlots()

      // 7. Reset play info
      state.playHitsChecked.value = false
      state.playPortion.value = 0
      state.hitsInfo.value = undefined
      state.isPlaying.value = true

      // 8. Emit business events
      playerEvents.emit({ type: 'track-changed', trackId, timestamp: Date.now() })

      // 9. Notify switch complete
      onSwitchComplete()
    } catch (err: any) {
      if (disposed) return
      state.isLoading.value = false
      WMessage(err?.message || 'Failed to switch track', 'error')
      playerEvents.emit({ type: 'error', message: err?.message || 'Switch failed', timestamp: Date.now() })
    } finally {
      state.isLoading.value = false
    }
  }

  function getCurrentTrackId(): number {
    return currentTrackId
  }

  function dispose() {
    disposed = true
  }

  return {
    init,
    dispose,
    switchTo,
    getCurrentTrackId,
  }
}
