import { PlayerEvent } from "../events";
import type { PlayerEventMap } from "../events";
import type { Emitter } from "@/shared/emitter";
import type { QueueStore } from "@/store/queue";
import type { StreamResolver } from "@/services/stream-resolver";
import type { CacheService } from "@/services/cache";

const URL_AHEAD = 3;             // URL 层：轻量，覆盖未来 3 首
const BYTES_AHEAD = 2;           // 字节层：中量，覆盖未来 2 首，按配额收敛
const REFRESH_TICK_MS = 30000;   // 期中重解析节拍
const PRELOAD_DELAY_MS = 3000;   // 预热延迟：让当前曲首载链路独享带宽
const LOADING_RETRY_MS = 2000;   // 当前曲仍在加载时的顺延节拍

/**
 * 预加载控制器：纵深防御 + 让路首载
 * 双层预热，字节层依赖 URL 层（prepare 的幂等性是两层的接缝）
 * 时机约束：当前曲目加载完成后延迟触发——首载期间不发任何预热请求，
 * 避免整文件下载与 audio 元素的字节流争抢连接池/带宽
 * 一切失败静默——预加载是优化，正确性兜底永远在 inline fallback
 */
export function createPreloadController(
  queue: QueueStore,
  bus: Emitter<PlayerEventMap>,
  resolver: StreamResolver,
  cache: CacheService,
) {
  let warmTimer: ReturnType<typeof setTimeout> | null = null
  let warming = false

  function warmUrls() {
    for (const t of queue.peekNext(URL_AHEAD)) {
      resolver.prepare(t.id).catch(() => {})
    }
  }

  async function warmBytes() {
    for (const t of queue.peekNext(BYTES_AHEAD)) {
      if (cache.has(t.id)) continue   // 已有本地字节，跳过整段下载
      try {
        await resolver.prepare(t.id)    // 幂等：已有效直接穿过
        const url = resolver.get(t.id)
        if (url !== null) await cache.store(t.id, url)
      } catch { /* 静默 */ }
    }
  }

  /** 当前曲字节落盘：下次启动本地直读，实现近零 buffering */
  async function persistCurrent() {
    const t = queue.currentTrack
    if (t === null || cache.has(t.id)) return
    try {
      await resolver.prepare(t.id)
      const url = resolver.get(t.id)
      if (url !== null) await cache.store(t.id, url)
    } catch { /* 静默 */ }
  }

  /** 串行预热：先落盘当前曲，再预热未来曲目，全程避免并发整文件下载 */
  async function warm() {
    if (warming) return
    warming = true
    try {
      await persistCurrent()
      warmUrls()
      await warmBytes()
    } finally {
      warming = false
    }
  }

  /** 延迟调度（防抖合并）；到期时当前曲仍在加载则顺延 */
  function scheduleWarm(delayMs: number = PRELOAD_DELAY_MS) {
    if (warmTimer !== null) clearTimeout(warmTimer)
    warmTimer = setTimeout(() => {
      warmTimer = null
      if (queue.engineState === 'loading') {
        scheduleWarm(LOADING_RETRY_MS)
        return
      }
      void warm()
    }, delayMs)
  }

  const offTrack = bus.on(PlayerEvent.TrackChanged, () => scheduleWarm())
  const offQueue = bus.on(PlayerEvent.QueueChanged, () => scheduleWarm())
  const offMode = bus.on(PlayerEvent.ModeChanged, () => scheduleWarm())   // 乱序重洗未来序列

  // 期中重解析：长曲目（>8min）跨越 TTL 边界时，靠这个节拍保持 URL 常青
  // prepare 幂等自动过滤未过期条目，节拍只在过期后真正触发 fetch
  const timer = setInterval(() => {
    if (queue.currentTrack === null) return
    if (queue.engineState === 'loading') return   // 首载期间让路
    warmUrls()
  }, REFRESH_TICK_MS)

  function dispose() {
    offTrack()
    offQueue()
    offMode()
    if (warmTimer !== null) clearTimeout(warmTimer)
    clearInterval(timer)
  }

  return { dispose }
}
