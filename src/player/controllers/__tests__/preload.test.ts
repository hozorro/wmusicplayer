// player/controllers/__tests__/preload.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createEmitter } from '@/player/shared/emitter'
import { createPreloadController } from '../preload'
import { useQueueStore } from '@/store/queue'
import { PlayerEvent } from '../../events'
import type { PlayerEventMap } from '../../events'
import type { StreamResolver } from '@/services/stream-resolver'
import type { CacheService } from '@/services/cache'
import type { PlayTrack } from '../../types'
import { DEFAULT_CONFIG } from '@/config/player-config'

// Mock localStorage for musicStore
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(() => null),
}
globalThis.localStorage = localStorageMock as Storage

const T = (id: number): PlayTrack => ({ id, title: `t${id}`, artists: [{ id: 1, name: 'a' }] })

/** 测试配置：与 DEFAULT_CONFIG 保持一致，可覆盖特定值 */
const testConfig = {
  URL_AHEAD: DEFAULT_CONFIG.URL_AHEAD,
  BYTES_AHEAD: DEFAULT_CONFIG.BYTES_AHEAD,
  REFRESH_TICK_MS: DEFAULT_CONFIG.REFRESH_TICK_MS,
  PRELOAD_DELAY_MS: 3000,
  LOADING_RETRY_MS: 2000,
}

let queue: ReturnType<typeof useQueueStore>
let bus: ReturnType<typeof createEmitter<PlayerEventMap>>
let resolver: StreamResolver
let cache: CacheService

beforeEach(() => {
  vi.useFakeTimers()
  setActivePinia(createPinia())
  queue = useQueueStore()
  bus = createEmitter<PlayerEventMap>()
  resolver = {
    prepare: vi.fn().mockResolvedValue(undefined),
    get: vi.fn((id: number) => `/stream/${id}`),
    invalidate: vi.fn(),
  } as unknown as StreamResolver
  cache = {
    ready: Promise.resolve(),
    has: vi.fn(() => false),
    localUrl: vi.fn((id: number) => `/api/stream/local/${id}`),
    store: vi.fn().mockResolvedValue(undefined),
    forget: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  } as unknown as CacheService
})
afterEach(() => vi.useRealTimers())

function seed(ids: number[]) {
  queue.tracks = ids.map(T)
  queue.rebuildOrder(0)
}

describe('让路首载的延迟预热', () => {
  it('TrackChanged 后延迟期内不发起任何预热请求', () => {
    createPreloadController(queue, bus, resolver, cache, testConfig)
    seed([1, 2, 3, 4, 5])
    bus.emit(PlayerEvent.TrackChanged, T(1))
    vi.advanceTimersByTime(testConfig.PRELOAD_DELAY_MS - 1)
    expect(resolver.prepare).not.toHaveBeenCalled()
    expect(cache.store).not.toHaveBeenCalled()
  })

  it('延迟到期：当前曲落盘 + URL 层覆盖未来 3 首 + 字节层覆盖未来 2 首', async () => {
    createPreloadController(queue, bus, resolver, cache, testConfig)
    seed([1, 2, 3, 4, 5])
    bus.emit(PlayerEvent.TrackChanged, T(1))
    vi.advanceTimersByTime(testConfig.PRELOAD_DELAY_MS)
    // 串行预热：当前曲优先落盘，随后是未来 2 首的字节
    await vi.waitFor(() => expect(cache.store).toHaveBeenCalledTimes(3))
    expect(cache.store).toHaveBeenCalledWith(1, '/stream/1')
    expect(cache.store).toHaveBeenCalledWith(2, '/stream/2')
    expect(cache.store).toHaveBeenCalledWith(3, '/stream/3')
    const ids = (resolver.prepare as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0])
    expect(new Set(ids)).toEqual(new Set([1, 2, 3, 4]))
  })

  it('已有本地字节的未来曲目跳过下载', async () => {
    (cache.has as ReturnType<typeof vi.fn>).mockImplementation((id: number) => id === 2)
    createPreloadController(queue, bus, resolver, cache, testConfig)
    seed([1, 2, 3])
    bus.emit(PlayerEvent.TrackChanged, T(1))
    vi.advanceTimersByTime(testConfig.PRELOAD_DELAY_MS)
    await vi.waitFor(() => expect(cache.store).toHaveBeenCalledTimes(2))
    expect(cache.store).not.toHaveBeenCalledWith(2, expect.anything())
    expect(cache.store).toHaveBeenCalledWith(3, '/stream/3')
  })

  it('当前曲仍在 loading：到期顺延，加载完成后才预热', async () => {
    createPreloadController(queue, bus, resolver, cache, testConfig)
    seed([1, 2, 3])
    queue.setEngineState('loading')
    bus.emit(PlayerEvent.TrackChanged, T(1))

    vi.advanceTimersByTime(testConfig.PRELOAD_DELAY_MS)
    expect(resolver.prepare).not.toHaveBeenCalled()   // 首载期间让路

    queue.setEngineState('playing')
    vi.advanceTimersByTime(testConfig.LOADING_RETRY_MS)          // 顺延节拍到达
    await vi.waitFor(() => expect(resolver.prepare).toHaveBeenCalled())
  })

  it('防抖合并：连续事件只预热一轮', async () => {
    createPreloadController(queue, bus, resolver, cache, testConfig)
    seed([1, 2, 3])
    bus.emit(PlayerEvent.TrackChanged, T(1))
    vi.advanceTimersByTime(1000)
    bus.emit(PlayerEvent.QueueChanged, 'add')
    vi.advanceTimersByTime(testConfig.PRELOAD_DELAY_MS)
    await vi.waitFor(() => expect(cache.store).toHaveBeenCalledTimes(3))
  })

  it('ModeChanged 重新调度预热（乱序重洗未来序列）', async () => {
    createPreloadController(queue, bus, resolver, cache, testConfig)
    seed([1, 2, 3])
    bus.emit(PlayerEvent.ModeChanged, 'shuffle')
    vi.advanceTimersByTime(testConfig.PRELOAD_DELAY_MS)
    await vi.waitFor(() => expect(resolver.prepare).toHaveBeenCalled())
  })
})

describe('A28 期中重解析节拍', () => {
  it('空队列不刷新；有当前曲目时按节拍重解析', () => {
    createPreloadController(queue, bus, resolver, cache, testConfig)
    vi.advanceTimersByTime(90_000)
    expect(resolver.prepare).not.toHaveBeenCalled()
    seed([1, 2])
    vi.advanceTimersByTime(30_000)
    expect(resolver.prepare).toHaveBeenCalledWith(2)
  })

  it('当前曲 loading 期间跳过节拍', () => {
    createPreloadController(queue, bus, resolver, cache, testConfig)
    seed([1, 2])
    queue.setEngineState('loading')
    vi.advanceTimersByTime(30_000)
    expect(resolver.prepare).not.toHaveBeenCalled()
  })
})

describe('A39 静默原则', () => {
  it('store 拒绝不产生未处理异常', async () => {
    (cache.store as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('quota exceeded'))
    createPreloadController(queue, bus, resolver, cache, testConfig)
    seed([1, 2])
    bus.emit(PlayerEvent.TrackChanged, T(1))
    vi.advanceTimersByTime(testConfig.PRELOAD_DELAY_MS)
    await vi.waitFor(() => expect(cache.store).toHaveBeenCalled())
    // 无 unhandled rejection 即通过
  })
})
