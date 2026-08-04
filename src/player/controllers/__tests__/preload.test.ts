// player/controllers/__tests__/preload.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createEmitter } from '@/shared/emitter'
import { createPreloadController } from '../preload'
import { useQueueStore } from '@/store/queue'
import { PlayerEvent } from '../../events'
import type { PlayerEventMap } from '../../events'
import type { StreamResolver } from '@/services/stream-resolver'
import type { CacheService } from '@/services/cache'
import type { PlayTrack } from '../../types'

const T = (id: number): PlayTrack => ({ id, title: `t${id}`, artists: ['a'] })

let queue: ReturnType<typeof useQueueStore>
let bus: ReturnType<typeof createEmitter<PlayerEventMap>>
let resolver: StreamResolver
let cache: CacheService

beforeEach(() => {
  setActivePinia(createPinia())
  queue = useQueueStore()
  bus = createEmitter<PlayerEventMap>()
  resolver = {
    prepare: vi.fn().mockResolvedValue(undefined),
    get: vi.fn((id: number) => `/stream/${id}`),
    invalidate: vi.fn(),
  } as unknown as StreamResolver
  cache = {
    prefetch: vi.fn().mockResolvedValue(undefined),
    isCached: vi.fn(), clear: vi.fn(),
  } as unknown as CacheService
})
afterEach(() => vi.useRealTimers())

function seed(ids: number[]) {
  queue.tracks = ids.map(T)
  queue.rebuildOrder(0)
}

describe('双层预热', () => {
  it('TrackChanged：URL 层覆盖未来 3 首', () => {
    createPreloadController(queue, bus, resolver, cache)
    seed([1, 2, 3, 4, 5])
    bus.emit(PlayerEvent.TrackChanged, T(1))
    const ids = (resolver.prepare as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0])
    expect(new Set(ids)).toEqual(new Set([2, 3, 4]))
  })

  it('字节层消费 URL 层成果：预取最近 2 首的解析地址', async () => {
    createPreloadController(queue, bus, resolver, cache)
    seed([1, 2, 3])
    bus.emit(PlayerEvent.TrackChanged, T(1))
    await vi.waitFor(() => expect(cache.prefetch).toHaveBeenCalledTimes(2))
    expect(cache.prefetch).toHaveBeenCalledWith('/stream/2')
    expect(cache.prefetch).toHaveBeenCalledWith('/stream/3')
  })

  it('ModeChanged 重新预热（乱序重洗未来序列）', () => {
    createPreloadController(queue, bus, resolver, cache)
    seed([1, 2, 3])
    bus.emit(PlayerEvent.ModeChanged, 'shuffle')
    expect(resolver.prepare).toHaveBeenCalled()
  })
})

describe('A28 期中重解析节拍', () => {
  it('空队列不刷新；有当前曲目时按节拍重解析', () => {
    vi.useFakeTimers()
    createPreloadController(queue, bus, resolver, cache)
    vi.advanceTimersByTime(90_000)
    expect(resolver.prepare).not.toHaveBeenCalled()
    seed([1, 2])
    vi.advanceTimersByTime(30_000)
    expect(resolver.prepare).toHaveBeenCalledWith(2)
  })
})

describe('A39 静默原则', () => {
  it('prefetch 拒绝不产生未处理异常', async () => {
    (cache.prefetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('quota exceeded'))
    createPreloadController(queue, bus, resolver, cache)
    seed([1, 2])
    bus.emit(PlayerEvent.TrackChanged, T(1))
    await vi.waitFor(() => expect(cache.prefetch).toHaveBeenCalled())
    // 无 unhandled rejection 即通过
  })
})