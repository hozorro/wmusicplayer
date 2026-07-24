/**
 * Controller — Playlist
 *
 * Manages the PlaylistModel and synchronizes with the music store.
 * Listens to PlayerEvents and EngineEvents to drive navigation decisions.
 * Does NOT operate audio elements directly — delegates to transition controller.
 */

import { storeToRefs } from 'pinia'
import { watch } from 'vue'
import { useMusicStore } from '@/store/music'
import { PlayChangeMode, SeqMode } from '@/constants/play-constants'
import { createPlaylistModel, type PlaylistModel } from '../playlist/model'
import type { Engine } from '../audio-engine/interfaces'
import type { PlayerEventBus } from '../events'
import type { PlayerState } from '../state'
import type { Controller } from '../types'

export interface PlaylistController extends Controller {
  /** Play a specific track by playlist index */
  playTrack(index: number, directChange?: boolean): void
  /** Navigate to next track */
  next(): void
  /** Navigate to previous track */
  prev(): void
  /** Remove a track from playlist */
  removeTrack(id: number): void
  /** Cycle sequence mode */
  cycleMode(): void
  /** Handle external playlist change (from store) */
  handlePlaylistChange(): void
  /** Handle track ended (auto-next or loop) */
  handleEnded(): void
  /** Click on playlist item */
  playlistItemClick(index: number, callback: () => void): void
  /** Get the underlying model for queries */
  getModel(): PlaylistModel
}

interface PlaylistControllerDeps {
  engine: Engine
  playerEvents: PlayerEventBus
  state: PlayerState
  /** Callback to trigger the actual track switch (provided by facade) */
  onSwitchTrack: () => void
}

export function createPlaylistController(deps: PlaylistControllerDeps): PlaylistController {
  const { engine, playerEvents, state, onSwitchTrack } = deps
  const store = useMusicStore()
  const { curPlaylist, curPlayIndex, playlistChanged } = storeToRefs(store)
  const model = createPlaylistModel()

  let disposed = false

  function init() {
    // Sync tracks from store
    model.setTracks(curPlaylist.value, curPlayIndex.value)
    model.initSeq()
    state.seqMode.value = model.mode

    // Watch for store playlist changes
    watch(playlistChanged, (newMode) => {
      if (disposed) return
      if (newMode !== PlayChangeMode.DONOTHING) {
        handlePlaylistChange()
      }
    })

    watch(curPlaylist, () => {
      if (disposed) return
      model.setTracks(curPlaylist.value, curPlayIndex.value)
    })
  }

  function playTrack(index: number, directChange = false) {
    if (!directChange) {
      curPlayIndex.value = model.seqList[model.seqIndex]
    }
    model.jumpTo(index)
    onSwitchTrack()
  }

  function next() {
    if (model.mode === SeqMode.SINGLE_LOOP) return
    const result = model.next(store.getParam('isLoop'))
    if (!result) return
    curPlayIndex.value = result.index
    onSwitchTrack()
  }

  function prev() {
    if (model.mode === SeqMode.SINGLE_LOOP) return
    const result = model.prev(store.getParam('isLoop'))
    if (!result) return
    curPlayIndex.value = result.index
    onSwitchTrack()
  }

  function removeTrack(id: number) {
    const removeIndex = curPlaylist.value.findIndex((item) => item.id === id)
    if (removeIndex === -1) return

    curPlaylist.value.splice(removeIndex, 1)
    const result = model.removeTrack(removeIndex)

    // Emit playlist-changed so preload controller can invalidate
    playerEvents.emit({ type: 'playlist-changed', timestamp: Date.now() })

    if (result.shouldPlayNext) {
      next()
    }
  }

  function cycleMode() {
    model.cycleMode()
    state.seqMode.value = model.mode
    playerEvents.emit({ type: 'play-mode-changed', mode: model.mode, timestamp: Date.now() })
  }

  function handlePlaylistChange() {
    const mode = playlistChanged.value
    if (mode === PlayChangeMode.DONOTHING) return

    // Sync tracks before handling
    model.setTracks(curPlaylist.value, curPlayIndex.value)

    if (model.seqList.length === 0) {
      model.initSeq()
    }

    switch (mode) {
      case PlayChangeMode.ADD_CUR:
        model.handleChange(mode)
        onSwitchTrack()
        break
      case PlayChangeMode.ADD_NEXT:
      case PlayChangeMode.ADD_LAST:
      case PlayChangeMode.ADD_LIST_LAST:
        model.handleChange(mode)
        break
      case PlayChangeMode.REPLACE_LIST:
      case PlayChangeMode.REPLACE_LIST_RND:
        model.handleChange(mode)
        state.seqMode.value = model.mode
        onSwitchTrack()
        break
      case PlayChangeMode.DIRECT_PLAY:
        model.jumpTo(curPlayIndex.value)
        onSwitchTrack()
        break
    }

    // Reset the store flag
    playlistChanged.value = PlayChangeMode.DONOTHING

    playerEvents.emit({ type: 'playlist-changed', timestamp: Date.now() })
  }

  function handleEnded() {
    if (!store.getParam('isAutoPlayNext')) {
      engine.pauseSlot(engine.getActiveSlot()?.id ?? 'A')
      return
    }

    if (model.mode === SeqMode.SINGLE_LOOP) {
      // Single loop: replay from start on the same slot
      const activeSlot = engine.getActiveSlot()
      if (activeSlot) {
        activeSlot.audio.currentTime = 0
        activeSlot.audio.play().catch(() => {})
      }
      return
    }

    next()
  }

  function playlistItemClick(index: number, callback: () => void) {
    curPlayIndex.value = index
    model.jumpTo(index)
    onSwitchTrack()
    callback()
  }

  function dispose() {
    disposed = true
  }

  return {
    init,
    dispose,
    playTrack,
    next,
    prev,
    removeTrack,
    cycleMode,
    handlePlaylistChange,
    handleEnded,
    playlistItemClick,
    getModel: () => model,
  }
}
