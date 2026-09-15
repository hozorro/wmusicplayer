import { watch, type Ref } from 'vue'
import { PlayerEvent, type PlayerEventMap } from '../events'
import type { Emitter } from '@/shared/emitter'
import type { QueueStore } from '@/store/queue'
import type { PlayerIntents, PlayTrack } from '../types'

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

function artworkOf(url?: string): MediaImage[] {
  if (!url) return []
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase() ?? ''
  // sizes 为惯例声明；锁屏渲染按实际分辨率自适应，不依赖该值
  return [{ src: url, type: MIME_BY_EXT[ext] ?? 'image/jpeg', sizes: '512x512' }]
}

/**
 * MediaSession 控制器 —— 双向
 * 出站：播放器状态 -> 锁屏 / 控制中心 / 耳机（metadata / playbackState / positionState）
 * 入站：系统控制面 -> 与 UI 点击同源的intents（play / pause / seek / ...）
 * 
 * 投影真实性原则：外围状态是"期望态 x 实际态"的合成
 * 不是实际态的拷贝——buffering 仅在 intent=play 时投影为 playing
 */
export function createMediaSessionController(
  queue: QueueStore,
  bus: Emitter<PlayerEventMap>,
  intents: PlayerIntents,
  time: Ref<number>
) {
  // 环境降级：无 MediaSession 时返回无操作面，装配方无感知
  if (!('mediaSession' in navigator)) {
    return { supported: false as const, dispose: () => {} }
  }

  const ms = navigator.mediaSession

   // —— 出站：状态投影 ——
  function projectMetadata(t: PlayTrack) {
    ms.metadata = new MediaMetadata({
      title: t.title,
      artist: t.artists?.map(a => a.name).join(', ') ?? '',
      album: t.album?.title ?? '',
      artwork: artworkOf(t.cover),
    })
  }

  function projectState() {
    const s = queue.engineState
    const active = s === 'playing' || s === 'buffering' || s === 'loading'
    ms.playbackState = queue.intent === 'play' && active ? 'playing' : 'paused'
  }

  let lastSecond = -1
  function projectPosition(force = false) {
    if (!('setPositionState' in ms)) return

    const duration = queue.duration
    if (!Number.isFinite(duration) || duration <= 0) return

    const second = Math.floor(time.value)
    if (!force && lastSecond === second) return // 整秒节流：4Hz timeupdate -> 1Hz 投影
    lastSecond = second
    try {
      ms.setPositionState({
        duration,
        position: Math.max(0, Math.min(time.value, duration)),
        playbackRate: 1,
      })
    } catch { /* 个别浏览器对边界值抛异常，ignore */ }
  }

  const offTrack = bus.on(PlayerEvent.TrackChanged, t => {
    projectMetadata(t)
    projectState()
    lastSecond = -1
    projectPosition(true) // 换曲立即重置进度投影
  })

  const offState = bus.on(PlayerEvent.StateChanged, () => projectState())
  const offDuration = watch(() => queue.duration, () => projectPosition(true))
  const offTime = watch(time, () => projectPosition())

  // —— 入站：外部指令面 -> intents（与 UI 点击同源） ——
  const actions: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
    ['play',          () => intents.play()],
    ['pause',         () => intents.pause()],
    ['stop',          () => intents.pause()], // 无 stop 语义，降级为 pause
    ['nexttrack',     () => intents.next()],
    ['previoustrack', () => intents.prev()],
    ['seekto',        d => { if (d.seekTime != null) intents.seek(d.seekTime) }],
    ['seekbackward',  d => intents.seek(Math.max(0, time.value - (d.seekOffset ?? 10)))],
    ['seekforward',   d => intents.seek(Math.min(
      queue.duration > 0 ? queue.duration : Infinity,
      time.value + (d.seekOffset ?? 10)))],
  ]

  for (const [action, handler] of actions) {
    try {
      ms.setActionHandler(action, handler)
    } catch {
      /* 桌面浏览器对部分 action 抛 NotSupportedError，静默降级 ignore */
    }
  }

  function dispose() {
    offTrack()
    offState()
    offDuration()
    offTime()
    for (const [action] of actions) {
      try { ms.setActionHandler(action, null) } catch { /* ignore */ }
    }
    ms.metadata = null
    ms.playbackState = 'none'
  }

  return { supported: true as const, dispose }
}

export type MediaSessionController = ReturnType<typeof createMediaSessionController>
