import type { PlayerConfig } from '@/config/player-config'
import { onConfigChange } from '@/config/config-provider'

const CACHE_NAME = 'media-v1'   // 独立缓存桶，与 SW 静态资源缓存隔离
const LOCAL_PREFIX = '/api/stream/local/'

/**
 * 曲目字节的本地稳定地址：以 track_id 为键，不随签名 URL 的 token 轮换漂移。
 * 沿用 /api/stream 前缀，SW 的 Range 感知路由（stream.ts）直接供给。
 */
export const localStreamUrl = (trackId: number) => `${LOCAL_PREFIX}${trackId}`

/**
 * 媒体字节缓存，track_id 稳定键版
 * 旧版以签名 URL 为键，token 一换键即失效，重启后必然 miss；
 * 现统一存储于 /api/stream/local/{trackId}，服务交给 SW 的 Range 感知路由
 * 
 * @param initialConfig 配置注入，保持模块纯净可测试
 */
export function createCacheService(
  initialConfig: Pick<PlayerConfig, 'MAX_CACHED_TRACKS'>,
) {
  let config = { ...initialConfig }

  const offConfig = onConfigChange((newConfig) => { config = { MAX_CACHED_TRACKS: newConfig.MAX_CACHED_TRACKS } })

  // 非安全上下文 / 老浏览器：全体降级为空操作（形状与正常面一致）
  if (typeof caches === 'undefined') {
    const noop = async () => {}
    return {
      ready: Promise.resolve(),
      has: () => false,
      localUrl: localStreamUrl,
      store: noop as (trackId: number, url: string) => Promise<void>,
      forget: noop as (trackId: number) => Promise<void>,
      clear: noop,
      dispose: () => {},
    }
  }

  /** 同步判定面：启动水合后常驻内存 */
  const present = new Set<number>()

  function parseLocalId(url: string): number | null {
    const idx = url.indexOf(LOCAL_PREFIX)
    if (idx === -1) return null
    const id = Number(url.slice(idx + LOCAL_PREFIX.length))
    return Number.isInteger(id) ? id : null
  }

  // 启动水合：枚举既有本地键建立同步判定面
  const ready = (async () => {
    try {
      const cache = await caches.open(CACHE_NAME)
      for (const req of await cache.keys()) {
        const id = parseLocalId(req.url)
        if (id !== null) present.add(id)
      }
    } catch { /* 水合失败降级：一律按未缓存处理 */ }
  })()

  function has(trackId: number): boolean {
    return present.has(trackId)
  }

  /** 幂等落盘：整文件下载（不带 Range），按稳定键存储 */
  async function store(trackId: number, url: string): Promise<void> {
    await ready
    if (present.has(trackId)) return
    const res = await fetch(url)
    if (!res.ok) throw new Error(`store failed: ${res.status}`)
    const cache = await caches.open(CACHE_NAME)
    await cache.put(localStreamUrl(trackId), res)
    present.add(trackId)
    await prune()
  }

  /** 移除条目（本地键被清退/失效时的自愈出口） */
  async function forget(trackId: number): Promise<void> {
    present.delete(trackId)
    try {
      const cache = await caches.open(CACHE_NAME)
      await cache.delete(localStreamUrl(trackId))
    } catch { /* 静默 */ }
  }

  /** Cache API 的 keys() 按插入序返回，据此作 LRU 管理；顺带清理旧版签名 URL 键残留 */
  async function prune() {
    const cache = await caches.open(CACHE_NAME)
    const keys = await cache.keys()
    for (let i = 0; i < keys.length - config.MAX_CACHED_TRACKS; i++) {
      await cache.delete(keys[i])
      const id = parseLocalId(keys[i].url)
      if (id !== null) present.delete(id)
    }
  }

  async function clear(): Promise<void> {
    present.clear()
    await caches.delete(CACHE_NAME)
  }

  function dispose(): void {
    offConfig()
  }

  // 曲库重建后音频文件可能已替换，本地字节缓存整体作废
  if (typeof window !== 'undefined') {
    window.addEventListener('idb-rebuilt', () => { void clear() })
  }

  return { ready, has, localUrl: localStreamUrl, store, forget, clear, dispose }
}

export type CacheService = ReturnType<typeof createCacheService>
