import { PlayerEvent } from "../events";
import type { PlayerEventMap } from "../events";
import type { Emitter } from "@/shared/emitter";
import type { QueueStore } from "@/store/queue";
import type { StreamResolver } from "@/services/stream-resolver";
import type { CacheService } from "@/services/cache";

const URL_AHEAD = 3;            // URL 层：轻量，覆盖未来 3 首
const BYTES_AHEAD = 2;          // 字节 层：中量，覆盖未来 2 首，按配额收敛
const REFRESH_TICK_MS = 30000;  // 其中重解析节拍

/**
 * 预加载控制器：纵深防御
 * 双层预热，字节层以来 URL 层（prepare 的幂等性是两层的接缝）
 * 一切失败静默——预加载是优化，正确性兜底永远在 inline fallback
 */
export function createPreloadController(
  queue: QueueStore,
  bus: Emitter<PlayerEventMap>,
  resolver: StreamResolver,
  cache: CacheService,
) {
  function warmUrls() {
    for (const t of queue.peekNext(URL_AHEAD)) {
      resolver.prepare(t.id).catch(() => {})
    }
  }

  async function warmBytes() {
    for (const t of queue.peekNext(BYTES_AHEAD)) {
      try {
        await resolver.prepare(t.id)    // 幂等：已有效直接穿过
        const url = resolver.get(t.id)
        if (url !== null) await cache.prefetch(url)
      } catch { /* 静默 */ }
    }
  }

  const offTrack = bus.on(PlayerEvent.TrackChanged, () => { warmUrls(); void warmBytes() })
  const offQueue = bus.on(PlayerEvent.QueueChanged, () => { warmUrls(); void warmBytes() })
  const offMode = bus.on(PlayerEvent.ModeChanged, warmUrls)   // 乱序重洗未来系列

  // 期中重解析：长曲目（>8min）跨越 TTL 边界时，靠这个节拍保持 URL 常青
  // prepare 幂等自动过滤未过期条目，节拍只在过期后真正触发 fetch
  const timer = setInterval(() => {
    if (queue.currentTrack === null) return
    warmUrls()
  }, REFRESH_TICK_MS)

  function dispose() {
    offTrack()
    offQueue()
    offMode()
    clearInterval(timer)
  }

  return { dispose }
}
