import { ref, shallowRef, watch, type Ref, type ShallowRef } from 'vue'
import { PlayerEvent, type PlayerEventMap } from '../events'
import type { Emitter } from '@/shared/emitter'
import type { PlayTrack } from '../types'
import { findLine, parseLrc, type LyricLine } from '../lyric'

export type LyricStatus = 'none' | 'loading' | 'ready'

/**
 * 歌词控制器：time 旁路的第一个正式消费者
 * 两条约束：
 * 1. 写端去重：4Hz 的 time 输入只在跨行时写 currentLine，4Hz ≠ 4Hz 渲染
 * 2. 竞态守卫：异步取词以 trackId 校验身份，过期结果静默丢弃
 */
export function createLyricController(
  bus: Emitter<PlayerEventMap>,
  time: Ref<number>,
  fetchLyric: (trackId: number) => Promise<string>
) {
  const lines: ShallowRef<LyricLine[]> = shallowRef([])   // 整体替换，用不原地变更
  const currentLine: Ref<number> = ref(-1)
  const status: Ref<LyricStatus> = ref('none')
  let loadedForId: number | null = null

  const offTrack = bus.on(PlayerEvent.TrackChanged, t => { void loadLyrics(t) })

  // 高频旁路 -> 二分定位 -> 仅跨行写入
  const offTime = watch(time, t => {
    const line = findLine(lines.value, t)
    if (line !== currentLine.value) currentLine.value = line
    if (time.value > 3 && lines.value.length > 0  && lines.value[currentLine.value]?.text.trim())
      bus.emit(PlayerEvent.LyricLineChanged, lines.value[currentLine.value].text.trim())
  })

  async function loadLyrics(t: PlayTrack) {
    loadedForId = t.id
    lines.value = []        // 切歌即清空旧高亮，取词期间展示 loading 态
    currentLine.value = -1

    status.value = 'loading'
    try {
      const raw = await fetchLyric(t.id)
      if (loadedForId !== t.id) return    // 已切走：过期结果丢弃
      const parsed = parseLrc(raw)
      lines.value = parsed
      status.value = parsed.length > 0 ? 'ready' : 'none'
    } catch {
      if (loadedForId !== t.id) return    // 已切走：过期错误静默丢弃
      status.value = 'none'    // UI 降级展示
    }
    currentLine.value = findLine(lines.value, time.value)   // 中途载入：立即定位
  }

  function dispose() {
    offTrack()
    offTime()
  }

  return { lines, currentLine, status, dispose }
}

export type LyricController = ReturnType<typeof createLyricController>
