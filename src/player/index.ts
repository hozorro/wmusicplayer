/**
 * Player — Composition Root (Facade)
 *
 * usePlayer() is the ONLY entry point for the player system.
 * It ONLY assembles objects, injects dependencies, and manages lifecycle.
 * No business logic lives here.
 */

import { computed, onBeforeUnmount, onMounted, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMusicStore } from '@/store/music'
import { getTrackInfo, getStreamingUrl, favTrack } from '@/apis/methods/music'
import { updateHits, updateArtistHitCount, getArtistsByIds, updateFav, getTrackHits } from '@/apis/methods/idb-locals'
import WMessage from '@/composables/message'

import { createEngine } from './audio-engine/engine'
import { createPlayerEventBus } from './events'
import { createPlayerState } from './state'
import { createPlaylistController } from './controllers/playlist'
import { createTransitionController } from './controllers/transition'
import { createPreloadController } from './controllers/preload'
import { createLyricController } from './controllers/lyric'
import { createMediaSessionController } from './controllers/mediasession'
import type { PlayerFacade } from './types'

export function usePlayer(
  audioARef: Ref<HTMLAudioElement | null>,
  audioBRef: Ref<HTMLAudioElement | null>,
  lyricContainerRef?: Ref<HTMLElement | null>,
  switchCallback?: () => void,
): PlayerFacade {
  const store = useMusicStore()
  const { curPlaylist, curPlayIndex } = storeToRefs(store)

  // --- State & Event Bus (no DOM dependency, created immediately) ---
  const playerEvents = createPlayerEventBus()
  const state = createPlayerState()

  // --- Deferred references (assigned in onMounted after template renders) ---
  let engine: ReturnType<typeof createEngine>
  let playlistController: ReturnType<typeof createPlaylistController>
  let transitionController: ReturnType<typeof createTransitionController>
  let preloadController: ReturnType<typeof createPreloadController>
  let lyricController: ReturnType<typeof createLyricController>
  let mediaSessionController: ReturnType<typeof createMediaSessionController>

  onMounted(() => {
    // --- 1. Get Audio Elements from DOM refs ---
    const audioA = audioARef.value
    const audioB = audioBRef.value
    if (!audioA || !audioB) {
      console.error('[usePlayer] Audio elements are not defined')
      return
    }
    audioA.preload = 'auto'
    audioB.preload = 'auto'

    // --- 2. Create Engine ---
    engine = createEngine(audioA, audioB)

    // --- 3. Create Controllers (with dependency injection) ---

    // switchTrack is the bridge: playlist controller decides WHAT to play,
    // transition controller decides HOW to play it.
    const switchTrack = () => {
      const trackId = curPlaylist.value[curPlayIndex.value]?.id
      if (trackId !== undefined) {
        transitionController.switchTo(trackId)
      }
    }

    playlistController = createPlaylistController({
      engine,
      playerEvents,
      state,
      onSwitchTrack: switchTrack,
    })

    transitionController = createTransitionController({
      engine,
      engineEvents: engine.events,
      playerEvents,
      state,
      playlistController,
      onSwitchComplete: () => {
        switchCallback?.()
        preloadController.preloadNext()
      },
    })

    preloadController = createPreloadController({
      engine,
      engineEvents: engine.events,
      playerEvents,
      state,
      playlistController,
    })

    lyricController = createLyricController({
      engine,
      engineEvents: engine.events,
      playerEvents,
      state,
    })

    mediaSessionController = createMediaSessionController({
      engine,
      engineEvents: engine.events,
      playerEvents,
      state,
      actions: {
        play: togglePlay,
        pause: pause,
        next: playNext,
        previous: playPrev,
      },
    })

    // --- 4. Initialize all controllers ---
    playlistController.init()
    transitionController.init()
    preloadController.init()
    lyricController.init()
    mediaSessionController.init()

    // Set lyric container ref if provided
    if (lyricContainerRef) {
      lyricController.setLyricContainerRef(lyricContainerRef)
    }

    // --- 5. Bridge engine events to state ---
    engine.events.on('playing', (e) => {
      const activeSlot = engine.getActiveSlot()
      if (activeSlot && e.slotId === activeSlot.id) {
        state.isPlaying.value = true
      }
    })

    engine.events.on('paused', (e) => {
      const activeSlot = engine.getActiveSlot()
      if (activeSlot && e.slotId === activeSlot.id) {
        state.isPlaying.value = false
      }
    })

    engine.events.on('timeupdate', (e: any) => {
      const activeSlot = engine.getActiveSlot()
      if (activeSlot && e.slotId === activeSlot.id) {
        state.currentTime.value = e.currentTime
        state.duration.value = e.duration
      }
    })

    engine.events.on('ended', (e) => {
      const activeSlot = engine.getActiveSlot()
      if (activeSlot && e.slotId === activeSlot.id) {
        playEnded()
      }
    })

    // --- 6. Initial load ---
    if (curPlaylist.value.length > 0) {
      const tid = curPlaylist.value[curPlayIndex.value]?.id
      if (tid) {
        getTrackInfo(tid).then((data) => {
          state.currentTrack.id = tid
          state.currentTrack.title = data.title
          state.currentTrack.artists = data.artists
          state.currentTrack.album = data.album
          state.currentTrack.duration = data.duration
          state.currentTrack.favorited_at = data.favorited_at
          state.currentTrack.cover = `/media/tracks/${tid}.jpg?v=${data.cover_art_hash || 'default'}`
        })
        getStreamingUrl(tid).then((streamUrl) => {
          // Load on slot A as initial
          engine.loadOnSlot('A', `/api/${streamUrl}`, tid).catch(() => {})
        })
      }
      preloadController.preloadNext()
    }
  })

  // --- 8. Actions (delegate to controllers) ---

  function togglePlay() {
    if (state.isPlaying.value) {
      pause()
    } else {
      play()
    }
  }

  async function play() {
    if (!engine) return
    const activeSlot = engine.getActiveSlot()
    if (!activeSlot) return

    try {
      await activeSlot.audio.play()
      state.isPlaying.value = true
      if (!state.lyric.value && state.currentTrack.id) {
        // Trigger lyric load if not already loaded
        playerEvents.emit({ type: 'track-changed', trackId: state.currentTrack.id, timestamp: Date.now() })
      }
    } catch (err: any) {
      WMessage(err?.message || 'Play failed', 'error')
    }
  }

  function pause() {
    if (!engine) return
    const activeSlot = engine.getActiveSlot()
    if (activeSlot) {
      activeSlot.audio.pause()
      state.isPlaying.value = false
    }
  }

  function playNext() {
    playlistController.next()
  }

  function playPrev() {
    playlistController.prev()
  }

  function seek(time: number) {
    if (!engine) return
    const activeSlot = engine.getActiveSlot()
    if (activeSlot) {
      engine.seekSlot(activeSlot.id, time)
    }
  }

  function switchPlay(directChange = false) {
    playlistController.playTrack(curPlayIndex.value, directChange)
  }

  function playEnded() {
    setTimeout(() => {
      playlistController.handleEnded()
    }, store.getParam('timeUpdateInterval'))
  }

  function handlePlaylistChange() {
    playlistController.handlePlaylistChange()
  }

  function playRemove(id: number) {
    preloadController.invalidateAll()
    playlistController.removeTrack(id)
  }

  function playlistItemClick(index: number, callback: () => void) {
    preloadController.invalidateAll()
    playlistController.playlistItemClick(index, callback)
  }

  function handleOrder() {
    playlistController.cycleMode()
    preloadController.invalidateAll()
    preloadController.preloadNext()
  }

  // --- Time Update (bridges engine timeupdate to hit counting + UI callback) ---
  let timeUpdateFlag: ReturnType<typeof setTimeout> | null = null

  function handleTimeUpdate(callback?: () => void) {
    if (timeUpdateFlag) return
    timeUpdateFlag = setTimeout(() => {
      const activeSlot = engine.getActiveSlot()
      if (activeSlot) {
        state.playPortion.value = activeSlot.audio.currentTime / activeSlot.audio.duration

        if (callback) callback()

        if (state.playPortion.value > store.getParam('stat_percent') / 100 && !state.playHitsChecked.value) {
          try {
            if (store.isIDBReady) {
              updateHits('track', state.currentTrack.id)
              if (state.currentTrack.artists) {
                for (const ar of state.currentTrack.artists) {
                  updateArtistHitCount(ar.id)
                }
              }
            }
          } catch (err) {
            WMessage('Fail to update hit.', 'error')
          } finally {
            state.playHitsChecked.value = true
          }
        }
      }
      timeUpdateFlag = null
    }, store.getParam('timeUpdateInterval'))
  }

  // --- Favorites ---

  async function handleFav() {
    const trackId = curPlaylist.value[curPlayIndex.value]?.id
    if (!trackId) return
    const favorited_at = await favTrack(trackId, !state.currentTrack.favorited_at)
    state.currentTrack.favorited_at = favorited_at || ''
  }

  async function fetchArtistsFavStatus() {
    state.artistsFavStatus.value = 'pending'
    try {
      const artists = await getArtistsByIds(state.currentTrack.artists?.map((a) => a.id) || [])
      state.artistsFavs.value = artists
      state.artistsFavStatus.value = artists.some((a) => a.favorited_at) ? 'hasFav' : 'noneFav'
    } catch (err) {
      state.artistsFavStatus.value = 'failed'
    }
  }

  async function switchArtistFav(artistId: number) {
    try {
      if (store.isIDBReady) {
        await updateFav('artist', artistId)
        fetchArtistsFavStatus()
      }
    } catch (err) {
      WMessage('failed to fav artist', 'error')
    }
  }

  function handleArtistFavs() {
    if (state.artistsFavsShow.value) {
      state.artistsFavsShow.value = false
      return
    }
    if (state.artistsFavs.value.length === 0) return
    if (state.artistsFavs.value.length === 1) switchArtistFav(state.artistsFavs.value[0].id)
    else state.artistsFavsShow.value = true
  }

  function handleArtistFavSelected(artistId: number) {
    switchArtistFav(artistId)
  }

  // --- Hits ---
  function loadHitsInfo(trackId: number) {
    if (state.hitsInfo.value && state.hitsInfo.value.length > 0) return
    getTrackHits(trackId)
      .then((data) => (state.hitsInfo.value = data))
      .catch(() => { state.hitsInfo.value = [] })
  }

  // --- Lyric ---
  function setLyricLineRef(el: HTMLElement | null, index: number) {
    if (el) {
      state.lyricLineRefs.value[index] = el
    }
  }

  // --- Computed ---
  const audioList = computed(() => curPlaylist.value)

  // --- Lifecycle ---
  onBeforeUnmount(() => {
    pause()
    playlistController?.dispose()
    transitionController?.dispose()
    preloadController?.dispose()
    lyricController?.dispose()
    mediaSessionController?.dispose()
    engine?.dispose()
    playerEvents.removeAll()
  })

  return {
    state,
    audioList,
    togglePlay,
    play,
    pause,
    playNext,
    playPrev,
    seek,
    switchPlay,
    playEnded,
    handlePlaylistChange,
    playRemove,
    playlistItemClick,
    handleOrder,
    handleTimeUpdate,
    handleFav,
    fetchArtistsFavStatus,
    handleArtistFavs,
    handleArtistFavSelected,
    loadHitsInfo,
    setLyricLineRef,
  }
}
