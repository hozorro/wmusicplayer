import { watch, type Ref } from 'vue'
import { PlayerEvent, type PlayerEventMap } from '../events'
import type { Emitter } from '@/shared/emitter'
import type { QueueStore } from '@/store/queue'
import { bumpArtistHit, bumpTrackHit } from '@/idb/app-api'

/** 计时阈值：曲目播放 50%，封顶 2 min（长曲目不拖长计时） */
const HIT_RATIO = 0.3
const HIT_MAX_SECONDS = 1 * 60

/** 回到该窗口内视为新一次播放（loop-one重播 / prev 重播起点） */
const RESTART_WINDOW = 1.5

/**
 * 播放统计控制器：消费 time 旁路，跨越阈值即计次
 * 写本地同时尽力即发后端
 */
export function createHitTracker(
  queue: QueueStore,
  bus: Emitter<PlayerEventMap>,
  time: Ref<number>
) {
  let currentId: number | null = null
  let hitDone = false

  const offTrack = bus.on(PlayerEvent.TrackChanged, t => {
    currentId = t.id
    hitDone = false
  })

  const offTime = watch(time, t => {
    // 跨过阈值后回到起点 = 新一次播放，重新武装
    if (hitDone && t < RESTART_WINDOW) { hitDone = false; return }
    if (hitDone || currentId == null) return

    const duration = queue.duration
    if (!Number.isFinite(duration) || duration <=0) return
    const hitAt = Math.max(1, Math.min(duration * HIT_RATIO, HIT_MAX_SECONDS))
    if (t < hitAt) return

    hitDone = true
    registerHit()
  })

  function registerHit() {
    const t = queue.currentTrack
    if (!t) return
    bumpTrackHit(t.id)
    for (const aid of (t.artists?.map(a => a.id) ?? [])) bumpArtistHit(aid)
  }

  function dispose() {
    offTrack()
    offTime()
  }

  return { dispose }
}
