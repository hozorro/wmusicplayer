/**
 * 用于 sw 拦截 '/api/stream' 的请求
 * ⚠️ 本函数必须完全自包含——workbox generateSW 会将本函数的代码复制到 sw 中
 * 任何模块级 import / 闭包引用都会失效
 */
export async function mediaStreamCacheHandler({ request }: { request: Request }): Promise<Response> {
  const CACHE = 'media-v1'

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
