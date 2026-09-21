import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { getPlayerFacade } from '@/player/facade'
import type { PlayTrack } from '@/player/types'
import { useRouter } from 'vue-router'

/** 播放面：传输 + 意图 + 状态投影 */
export function usePlayer() {
  const f = getPlayerFacade()
  const { queueState, curTrackId, curTrack, intent, engineState, duration, mode } = storeToRefs(f.queue)
  const isPlaying = computed(() => intent.value === 'play' && engineState.value === 'playing')
  const isBuffering = computed(() => engineState.value === 'loading' || engineState.value === 'buffering')
  const router = useRouter()

  const goToAlbum = (track: PlayTrack) => {
    router.push(`/album/${track.album?.id}`)
  }
  
  const goToArtist = (track: PlayTrack) => {
    router.push(`/artist/${track.artists?.[0].id}`)
  }

  return {
    queueState, curTrackId, curTrack, intent, engineState, duration, mode, 
    isPlaying, isBuffering,
    time: f.time, // 高频旁路：仅进度条/歌词组件订阅
    ...f.intents,
    goToAlbum, goToArtist
  }
}