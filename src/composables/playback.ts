import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { getPlayerFacade } from '@/player/facade'

/** 播放面：传输 + 意图 + 状态投影 */
export function usePlayer() {
  const f = getPlayerFacade()
  const { currentTrack, currentIndex, intent, engineState, duration, mode } = storeToRefs(f.queue)
  const isPlaying = computed(() => intent.value === 'play' && engineState.value === 'playing')
  const isBuffering = computed(() => engineState.value === 'loading' || engineState.value === 'buffering')
  return {
    currentTrack, currentIndex, intent, engineState, duration, mode, 
    isPlaying, isBuffering,
    time: f.time, // 高频旁路：仅进度条/歌词组件订阅
    ...f.intents
  }
}