/**
 * Player — State
 *
 * Reactive state object exposed by the Player Facade.
 * Combines derived engine state, business state, and transient state.
 */

import { reactive, ref, shallowRef, type Ref } from 'vue'
import type { SeqMode } from '@/constants/play-constants'
import type { LyricParser } from '@/utilies/lyric-parser'

export interface PlayerState {
  // --- Derived from Engine ---
  isPlaying: Ref<boolean>
  currentTime: Ref<number>
  duration: Ref<number>

  // --- Business State ---
  currentTrack: TrackInfo
  playPortion: Ref<number>
  playHitsChecked: Ref<boolean>
  seqMode: Ref<SeqMode>

  // --- Lyric State ---
  curLyricIndex: number
  curLyric: string
  lyricLoading: boolean
  lyricError: string
  lyric: Ref<LyricParser | null>
  lyrics: Ref<LyricLine[]>
  metadata: Ref<ReturnType<LyricParser['getMetadata']>>

  // --- Transient ---
  isLoading: Ref<boolean>

  // --- Hits ---
  hitsInfo: Ref<string[] | undefined>

  // --- Artists Fav ---
  artistsFavStatus: Ref<'pending' | 'hasFav' | 'noneFav' | 'failed'>
  artistsFavs: Ref<Pick<IDBArtist, 'id' | 'name' | 'favorited_at'>[]>
  artistsFavsShow: Ref<boolean>

  // --- Lyric Line Refs (for scrolling) ---
  lyricLineRefs: Ref<HTMLElement[]>
}

export function createPlayerState(): PlayerState {
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)

  const currentTrack: TrackInfo = reactive({
    id: 0,
    title: '',
    artists: undefined,
    album: undefined,
    duration: 0,
    cover: '',
  })

  const playPortion = ref(0)
  const playHitsChecked = ref(false)
  const seqMode = ref<SeqMode>(0 as SeqMode)

  const curLyricIndex = reactive({ value: -1 })
  const curLyric = reactive({ value: '' })
  const lyricLoading = reactive({ value: false })
  const lyricError = reactive({ value: '' })
  const lyric = shallowRef<LyricParser | null>(null)
  const lyrics = ref<LyricLine[]>([])
  const metadata = ref<ReturnType<LyricParser['getMetadata']>>({})

  const isLoading = ref(false)
  const hitsInfo = ref<string[] | undefined>([])

  const artistsFavStatus = ref<'pending' | 'hasFav' | 'noneFav' | 'failed'>('pending')
  const artistsFavs = ref<Pick<IDBArtist, 'id' | 'name' | 'favorited_at'>[]>([])
  const artistsFavsShow = ref(false)

  const lyricLineRefs = ref<HTMLElement[]>([])

  return {
    isPlaying,
    currentTime,
    duration,
    currentTrack,
    playPortion,
    playHitsChecked,
    seqMode,
    get curLyricIndex() { return curLyricIndex.value },
    set curLyricIndex(v: number) { curLyricIndex.value = v },
    get curLyric() { return curLyric.value },
    set curLyric(v: string) { curLyric.value = v },
    get lyricLoading() { return lyricLoading.value },
    set lyricLoading(v: boolean) { lyricLoading.value = v },
    get lyricError() { return lyricError.value },
    set lyricError(v: string) { lyricError.value = v },
    lyric,
    lyrics,
    metadata,
    isLoading,
    hitsInfo,
    artistsFavStatus,
    artistsFavs,
    artistsFavsShow,
    lyricLineRefs,
  }
}
