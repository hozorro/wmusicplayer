/**
 * 用于 sw 拦截 '/api/stream' 的请求
 */
export async function mediaStreamCacheHandler({ request }: { request: Request }): Promise<Response> {
  const CACHE = 'media-v1'

  /**
   * 模拟分片响应：从缓存Blob中按header中的range切出响应的chunk返回206
   * @param blob 缓存的Blob
   * @param header Range头
   * @returns 206 Partial Content
   */
  const slice = (blob: Blob, header: string): Response => {
    const m = /bytes=(\d*)-(\d*)/.exec(header)
    let start = m?.[1] ? Number(m[1]) : 0
    let end = m?.[2] ? Number(m[2]) : blob.size - 1
    if (m && !m[1] && m[2]) {    // 后缀_RANGE:bytes=-500
      start = Math.max(0, blob.size - Number(m[2]))
      end = blob.size - 1
    }
    end = Math.min(end, blob.size - 1)
    const chunk = blob.slice(start, end + 1)
    return new Response(chunk, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${blob.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunk.size),
        'Content-Type': blob.type || 'audio/mpeg',
      },
    })
  }

  // 完整缓存文件响应
  const full = (blob: Blob): Response => new Response(blob, {
    status: 200,
    headers: {
      'Accept-Ranges': 'bytes',
      'Content-Length': String(blob.size),
      'Content-Type': blob.type || 'audio/mpeg',
    },
  })

  const cache = await caches.open(CACHE)
  const cached = await cache.match(request.url)   // 按 url 匹配，Range 头不参与键
  const range = request.headers.get('Range')

  if (cached) {
    const blob = await cached.blob()
    return range ? slice(blob, range) : full(blob)
  }

  // miss：透传源站 Range 协商，异步回填整个文件（失败静默）
  const network = await fetch(request)
  if (network.ok || network.status === 206) {
    fetch(request.url)
      .then(r => (r.ok ? cache.put(request.url, r) : undefined))
      .catch(() => {})
  }
  return network
}
