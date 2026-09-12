import { watch, ref, type Ref } from 'vue'
import { PlayerEvent, type PlayerEventMap } from '../events'
import type { Emitter } from '@/shared/emitter'
import type { QueueStore } from '@/store/queue'
import type { PlayerIntents } from '../types'

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

  const title = ref('')
  const artist = ref('')
  const album = ref('')
  // 用于临时覆盖 album 的歌词内容
  const fakeAlbum = ref('')
  const artwork = ref<MediaImage[]>([])

  // —— 出站：状态投影 ——
  function projectMetadata() {
    ms.metadata = new MediaMetadata({
      title: title.value,
      artist: artist.value,
      album: fakeAlbum.value,
      artwork: artwork.value,
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
    title.value = t.title
    artist.value = t.artists?.map(a => a.name).join(', ') ?? ''
    album.value = t.album?.title ?? ''
    fakeAlbum.value = t.album?.title ?? ''
    artwork.value = artworkOf(t.cover)

    projectMetadata()
    projectState()
    lastSecond = -1
    projectPosition(true) // 换曲立即重置进度投影
  })

  const offState = bus.on(PlayerEvent.StateChanged, () => projectState())

  const offLyric = bus.on(PlayerEvent.LyricLineChanged, (lyricLine) => {
    fakeAlbum.value = lyricLine ? lyricLine : album.value
    projectMetadata()
  })

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
    offLyric()
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
