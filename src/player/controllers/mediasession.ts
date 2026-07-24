/**
 * Controller — MediaSession
 *
 * Manages the system Media Session API.
 * Listens to EngineEvents for playback state and PlayerEvents for metadata.
 * No longer binds directly to audio element events.
 */

import { getImageAsDataURI } from '@/utilies/general'
import defaultTrackArt from '@/assets/imgs/track_art.jpg'
import type { Engine } from '../audio-engine/interfaces'
import type { EngineEventBus } from '../audio-engine/events'
import type { PlayerEventBus } from '../events'
import type { PlayerState } from '../state'
import type { Controller } from '../types'

export interface MediaSessionController extends Controller {}

interface MediaSessionControllerDeps {
  engine: Engine
  engineEvents: EngineEventBus
  playerEvents: PlayerEventBus
  state: PlayerState
  /** Action callbacks for media session controls */
  actions: {
    play: () => void
    pause: () => void
    next: () => void
    previous: () => void
  }
}

export function createMediaSessionController(deps: MediaSessionControllerDeps): MediaSessionController {
  const { engine, engineEvents, playerEvents, state, actions } = deps

  let disposed = false
  const supported = 'mediaSession' in navigator

  function init() {
    if (!supported) return

    // Register action handlers
    const actionMap: [MediaSessionAction, () => void][] = [
      ['play', actions.play],
      ['pause', actions.pause],
      ['previoustrack', actions.previous],
      ['nexttrack', actions.next],
    ]

    for (const [action, handler] of actionMap) {
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch (e) {
        console.log(`MediaSession action ${action} not supported yet`)
      }
    }

    // Update playback state from engine events
    const updateState = () => {
      if (disposed || !supported) return
      const activeSlot = engine.getActiveSlot()
      if (!activeSlot) return

      navigator.mediaSession.playbackState = activeSlot.audio.paused ? 'paused' : 'playing'
      navigator.mediaSession.setPositionState({
        duration: activeSlot.audio.duration || 0,
        position: activeSlot.audio.currentTime || 0,
        playbackRate: activeSlot.audio.playbackRate,
      })
    }

    engineEvents.on('playing', updateState)
    engineEvents.on('paused', updateState)
    engineEvents.on('durationchange', updateState)
    engineEvents.on('timeupdate', updateState)

    // Update metadata when track changes
    playerEvents.on('track-changed', () => {
      if (disposed || !supported) return
      updateMetadata()
    })
  }

  async function updateMetadata() {
    if (!supported) return

    const track = state.currentTrack
    const artworkUrl = track.cover
      ? await getImageAsDataURI(track.cover)
      : defaultTrackArt

    const artwork = {
      src: artworkUrl as string,
      type:
        typeof artworkUrl === 'string'
          ? artworkUrl.substring(artworkUrl.indexOf(':') + 1, artworkUrl.indexOf(';'))
          : 'image/png',
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artists?.map((ar) => ar.name).join(','),
      album: track.album?.title,
      artwork: [artwork],
    })
  }

  function dispose() {
    disposed = true
    if (supported) {
      try {
        navigator.mediaSession.setActionHandler('play', null)
        navigator.mediaSession.setActionHandler('pause', null)
        navigator.mediaSession.setActionHandler('previoustrack', null)
        navigator.mediaSession.setActionHandler('nexttrack', null)
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  return { init, dispose }
}
