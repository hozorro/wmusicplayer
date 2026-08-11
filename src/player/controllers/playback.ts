import { watch, type Ref } from 'vue'
import { EngineEvent, PlayerEvent, type PlayerEventMap } from '../events'
import type { Emitter } from '@/shared/emitter'
import type { AudioRuntime } from '../runtime'
import type { StreamResolver } from '@/services/stream-resolver'
import type { QueueStore } from '@/store/queue'
import type { PlayTrack } from '../types'

/**
 * 播放控制器 = 调和器 + 传输
 * 把 audio 元素持续同步向期望态（currentTrack / intent），实际态写回 store
 * 
 * 硬约束：
 * - watch flush: 'sync'：ended -> advance ->换src -> play 同一个任务内完成
 * - 播放中换曲走 swapAndPlay 原子操作，零间隙
 * - 关键路径同步读 resolver，异步 fetch 仅用于 miss 兜底
 * - 异步间隙安全由两件事兜底：currentTrack 身份守卫 + runtime 串行队列
 */
export function createPlaybackController(
  runtime: AudioRuntime,
  queue: QueueStore,
  resolver: StreamResolver,
  bus: Emitter<PlayerEventMap>,
  time: Ref<number>
) {
  let loadedId: number | null = null

  /** 连续失败熔断：防 loop-all 无限跳环，防坏队列 burn-through 请求 */
  let consecutiveFailures = 0
  const MAX_CONSECUTIVE_FAILURES = 3

  // —— 期望态 -> 实际态 ——
  // immediate：冷启动恢复持久化队列后，首曲以暂停态预载（元数据/时长就位，等待手势）
  watch(() => queue.currentTrack, t => { void syncTrack(t) }, { flush: 'sync', immediate: true})
  watch(() => queue.intent, i => { syncIntent(i) }, { flush: 'sync' })
  // —— 状态迁移投影： StateChanged 唯一发射点 ——
  watch(() => queue.engineState, (n, p) => {
    if (n == p) return
    if (n == 'playing')  consecutiveFailures = 0  // 真实出声 = 链路健康，计数清零
    bus.emit(PlayerEvent.StateChanged, n)
  })

  runtime.on(EngineEvent.Ended, () => {
    switch (queue.advance()) {
      case 'repeated': runtime.seek(0); runtime.play(); break
      case 'ended': queue.intent = 'pause'; break
      case 'advanced': break  // position 写入已同步触发，sync watcher 接管
    }
  })
  runtime.on(EngineEvent.StateChanged, s => queue.setEngineState(s))
  runtime.on(EngineEvent.DurationChange, d => queue.setDuration(d))
  runtime.on(EngineEvent.TimeUpdate, t => { time.value = t })
  runtime.on(EngineEvent.Seeked, t => { time.value = t }) // 暂停态 seek 的 UI 回填
  runtime.on(EngineEvent.Error, e => {
    const t = queue.currentTrack
    if (t) failTrack(t, e)
  })

  async function syncTrack(t: PlayTrack | null) {
    if (t === null) {
      loadedId = null
      time.value = 0
      queue.setDuration(0)
      await runtime.stop()
      return
    }
    if (t.id === loadedId) { syncIntent(queue.intent); return } // 同曲守卫

    time.value = 0
    queue.setDuration(0)
    queue.setEngineState('loading')

    const url = resolver.get(t.id) ?? await inlineResolve(t.id)
    if (url === null) {
      failTrack(t, null)
      return
    }
    if (queue.currentTrack?.id !== t.id) return // 异步间隙内曲目已变

    loadedId = t.id //提前置位：加载期间到达的 play 意图经 syncIntent 排队生效
    if (queue.intent == 'play') {
      // 原子换曲。拒绝 ≠ 曲目失败（NotAllowed/Abort），真实态由 native 事件回写
      runtime.swapAndPlay(url).catch(() => {})
    } else {
      try {
        await runtime.load(url)
      } catch (err) {
        failTrack(t, err instanceof Error ? err : null)
        return
      }
      if (queue.currentTrack?.id !== t.id) return
      // 预载完成：paused 预载不产生任何状态迁移事件，实际态在此主动收敛。
      // 仅当 intent 仍为 pause 时写入——若加载期间用户已触发播放，
      // 让 native play 事件回写真值，避免 paused→playing 的投影闪烁
      if (queue.intent === 'pause') queue.setEngineState('paused')
    }
    bus.emit(PlayerEvent.TrackChanged, t)
  }

  function syncIntent(i: 'play' | 'pause') {
    if (loadedId === null) return // 无曲目可播；加载中的意图由 syncTrack 派发时读取
    i === 'play' ? runtime.play().catch(() => {}) : runtime.pause()
  }

  async function inlineResolve(trackId: number): Promise<string | null> {
    try {
      await resolver.prepare(trackId)
      return resolver.get(trackId)
    } catch {
      return null
    }
  }

  //** 曲目失败：跳下一首或停止。PlaybackError 唯一发射点 */
  function failTrack(t: PlayTrack, error: MediaError | Error | null) {
    if (queue.currentTrack?.id !== t.id) return // 已被跳过（native error 与 load 拒绝可能双发）
    consecutiveFailures++
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      queue.intent = 'pause'
      queue.setEngineState('error')
      bus.emit(PlayerEvent.PlaybackError, { track: t, error, action: 'stop' })
      return  // 熔断，不再跳过
    }
    const outcome = queue.skipNext()            // 错误跳过忽略 loop-one
    if (outcome === 'ended') {
      queue.intent = 'pause'
      queue.setEngineState('error')
    }
    bus.emit(PlayerEvent.PlaybackError, {
      track: t,
      error,
      action: outcome ==='advanced' ? 'skip' : 'stop'
    })
  }

  return {
    seek: (t: number) => runtime.seek(t),
    setVolume: (v: number) => runtime.setVolume(v),
  }
}

export type PlaybackController = ReturnType<typeof createPlaybackController>
