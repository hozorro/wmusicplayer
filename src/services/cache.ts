const CACHE_NAME = 'media-v1'   // 独立缓存桶，与 SW 静态资源缓存隔离
const MAX_CACHEd_TRACKS = 10    // 插入序 LRU 上限，防配额击穿

/**
 * 媒体字节缓存，只负责“把字节搬到本地”
 * 服务交给 SW 的 Range 感知路由
 */
export function createCacheService() {
  // 非安全上下文 / 老浏览器：全体降级为空操作
  if (typeof caches === 'undefined') {
    const noop = async () => {}
    return { prefetch: noop as (url: string) => Promise<void>, isCached: async () => false, clear: noop }
  }

  async function isCached(url: string): Promise<boolean> {
    const cache = await caches.open(CACHE_NAME)
    return (await cache.match(url)) !== undefined
  }

  /** 预取整个文件（不带 Range），幂等：已缓存直接返回 */
  async function prefetch(url: string): Promise<void> {
    if (await isCached(url)) return
    const res = await fetch(url)
    if (!res.ok) throw new Error(`prefetch failed: ${res.status}`)
    const cache = await caches.open(CACHE_NAME)
    await cache.put(url, res)
    await prune()
  }

  /** Cache API 的 keys() 按插入序返回，据此作 LRU 管理 */
  async function prune() {
    const cache = await caches.open(CACHE_NAME)
    const keys = await cache.keys()
    for (let i = 0; i < keys.length - MAX_CACHEd_TRACKS; i++) {
      await cache.delete(keys[i])
    }
  }

  async function clear(): Promise<void> {
    await caches.delete(CACHE_NAME)
  }

  return { prefetch, isCached, clear }
}

export type CacheService = ReturnType<typeof createCacheService>
