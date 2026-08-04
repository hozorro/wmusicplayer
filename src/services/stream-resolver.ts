/** token TTL 600s x 0.8 安全边际 */
export const RESOLVE_TTL_MS = 600 * 1000 * 0.8

/**
 * 流地址供给端口：去库层（fetcher）与播放域之间的桥梁
 * 契约：get同步、prepare异步——换曲关键路径只允许前者，避免await触发iOS杀进程
 */
export function createStreamResolver(fetcher: (trackId: number) => Promise<string>) {
  const cache = new Map<number, { url: string, expiresAt: number}>()

  function get(trackId: number): string | null {
    const hit = cache.get(trackId)
    if (!hit) return null
    if (hit.expiresAt < Date.now()) {
      cache.delete(trackId)
      return null
    }
    return hit.url
  }

  /** 幂等预热：缓存仍有效则跳过 */
  async function prepare(trackId: number, ttlMs: number = RESOLVE_TTL_MS): Promise<void> {
    if (get(trackId) !== null) return
    const streamUrl = await fetcher(trackId)
    const url = `/api/${streamUrl}`
    cache.set(trackId, { url, expiresAt: Date.now() + ttlMs })
  }

  function invalidate(trackId?: number) {
    if (trackId === undefined) cache.clear()
    else cache.delete(trackId)
  }

  return { get, prepare, invalidate }
}

export type StreamResolver = ReturnType<typeof createStreamResolver>
