// services/__tests__/stream-resolver.test.ts
import { describe, expect, it, vi } from 'vitest'
import { createStreamResolver } from '../stream-resolver'

describe('stream-resolver', () => {
  it('prepare 后 get 返回带 /api 前缀的地址', async () => {
    const r = createStreamResolver(vi.fn().mockResolvedValue('stream/xxx?token=a'))
    await r.prepare(1)
    expect(r.get(1)).toBe('/api/stream/xxx?token=a')
  })

  it('TTL 过期后 get 返回 null 并清掉条目', async () => {
    const r = createStreamResolver(vi.fn().mockResolvedValue('stream/1'))
    await r.prepare(1, -1000)   // 负 TTL：落库即过期
    expect(r.get(1)).toBeNull()
  })

  it('并发 prepare 同一 id 合并为一次 fetch（在途搭车）', async () => {
    let release!: (v: string) => void
    const fetcher = vi.fn(() => new Promise<string>(res => { release = res }))
    const r = createStreamResolver(fetcher)

    const p1 = r.prepare(1)
    const p2 = r.prepare(1)
    expect(fetcher).toHaveBeenCalledTimes(1)   // 双层预热同发也只有一次请求

    release('stream/1')
    await Promise.all([p1, p2])
    expect(r.get(1)).toBe('/api/stream/1')
  })

  it('缓存仍有效时 prepare 直接穿过，不产生 fetch', async () => {
    const fetcher = vi.fn().mockResolvedValue('stream/1')
    const r = createStreamResolver(fetcher)
    await r.prepare(1)
    await r.prepare(1)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('失败释出在途占位，后续调用可重试', async () => {
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce('stream/2')
    const r = createStreamResolver(fetcher)

    await expect(r.prepare(2)).rejects.toThrow('network down')
    await r.prepare(2)
    expect(r.get(2)).toBe('/api/stream/2')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('invalidate 清除指定条目 / 全部条目', async () => {
    const r = createStreamResolver(vi.fn().mockResolvedValue('stream/1'))
    await r.prepare(1)
    r.invalidate(1)
    expect(r.get(1)).toBeNull()

    await r.prepare(1)
    r.invalidate()
    expect(r.get(1)).toBeNull()
  })
})
