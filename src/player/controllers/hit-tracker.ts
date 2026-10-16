import { watch, type Ref } from 'vue'
import { PlayerEvent, type PlayerEventMap } from '../events'
import type { Emitter } from '@/player/shared/emitter'
import type { QueueStore } from '@/store/queue'
import { bumpArtistHit, bumpTrackHit } from '@/idb/app-api'
import type { PlayerConfig } from '@/config/player-config'
import { onConfigChange } from '@/config/config-provider'
import dayjs from 'dayjs'


/**
 * 播放统计控制器：消费 time 旁路，跨越阈值即计次
 * 写本地同时尽力即发后端
 * 
 * @param initalConfig 配置注入，保持模块纯净可测试
 */
export function createHitTracker(
  queue: QueueStore,
  bus: Emitter<PlayerEventMap>,
  time: Ref<number>,
  initialConfig: Pick<PlayerConfig, 'STAT_PERCENT' | 'HIT_MAX_SECONDS' | 'RESTART_WINDOW'>,
) {
  let config = { ...initialConfig }

  let currentId: number | null = null
  let hitDone = false

  const offConfig = onConfigChange(newConfig => {
    config = {
      STAT_PERCENT: newConfig.STAT_PERCENT,
      HIT_MAX_SECONDS: newConfig.HIT_MAX_SECONDS,
      RESTART_WINDOW: newConfig.RESTART_WINDOW,
    }
  })

  const offTrack = bus.on(PlayerEvent.TrackChanged, t => {
    currentId = t.id
    hitDone = false
  })

  const offTime = watch(time, t => {
    const { STAT_PERCENT, HIT_MAX_SECONDS, RESTART_WINDOW } = config
    // 跨过阈值后回到起点 = 新一次播放，重新武装
    if (hitDone && t < RESTART_WINDOW) { hitDone = false; return }
    if (hitDone || currentId == null) return

    const duration = queue.duration
    if (!Number.isFinite(duration) || duration <=0) return
    const hitAt = Math.max(1, Math.min(duration * STAT_PERCENT / 100, HIT_MAX_SECONDS))
    if (t < hitAt) return

    hitDone = true
    registerHit()
  })

  function registerHit() {
    const t = queue.curTrack
    if (!t) return
    bumpTrackHit(t.id)
    queue.pushToRequestQueue(dayjs().format('HH:mm:ss'), `Hit Track: ${t.id}`)
    for (const aid of (t.artists?.map(a => a.id) ?? [])) {
      bumpArtistHit(aid)
      queue.pushToRequestQueue(dayjs().format('HH:mm:ss'), `Hit Artist: ${aid}`)
    }
  }

  function dispose() {
    offConfig()
    offTrack()
    offTime()
  }

  return { dispose }
}
