// @vitest-environment happy-dom
// player/facade/__tests__/facade.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { EngineEvent } from '@/player/events'
import type { PlayTrack } from '../../types'

const runtimeMock = vi.hoisted(() => ({
  load: vi.fn().mockResolvedValue(undefined),
  swapAndPlay: vi.fn().mockResolvedValue(undefined),
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn().mockResolvedValue(undefined),
  seek: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  setVolume: vi.fn(),
  on: vi.fn(), off: vi.fn(), dispose: vi.fn(),
}))
vi.mock('../../runtime', () => ({ createAudioRuntime: () => runtimeMock }))

import { createPlayerFacade, type PlayerFacade } from '..'

const T = (id: number): PlayTrack => ({ id, title: `t${id}`, artists: ['a'] })

let facade: PlayerFacade
const fetchStreamUrl = vi.fn(async (id: number) => `stream/${id}`)

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  facade = createPlayerFacade({ fetchStreamUrl })
})

const flushed = () => vi.waitFor(() => {
  expect(runtimeMock.swapAndPlay).toHaveBeenCalled()
})

describe('facade 意图接线', () => {
  it('playAll：替换队列 + 同步读 resolver miss 后走 inline fetch + 原子换曲', async () => {
    facade.intents.playAll([T(1), T(2)])
    await flushed()
    expect(fetchStreamUrl).toHaveBeenCalledWith(1)          // id 是 number
    expect(runtimeMock.swapAndPlay).toHaveBeenCalledWith('/api/stream/1')
    expect(facade.queue.currentTrack?.id).toBe(1)
  })

  it('addAndPlay：消费 addMany 返回位置，队列与播放一次完成', async () => {
    facade.intents.playAll([T(1), T(2)])
    await flushed()
    facade.intents.addAndPlay([T(3)])
    await vi.waitFor(() => expect(runtimeMock.swapAndPlay).toHaveBeenLastCalledWith('/api/stream/3'))
    expect(facade.queue.currentTrack?.id).toBe(3)
    expect(facade.queue.tracks).toHaveLength(3)
  })

  it('playNext 是纯队列操作：不改变当前曲目，不触发换曲', async () => {
    facade.intents.playAll([T(1), T(2)])
    await flushed()
    vi.clearAllMocks()
    facade.intents.playNext(T(9))
    expect(facade.queue.currentTrack?.id).toBe(1)
    expect(runtimeMock.swapAndPlay).not.toHaveBeenCalled()
  })

  it('next 到末尾：裁决 ended 并落 pause 意图', async () => {
    facade.intents.playAll([T(1)])
    await flushed()
    facade.intents.next()
    expect(facade.queue.intent).toBe('pause')
  })

  it('prev 双策略：>3s 重播本曲，≤3s 回退上一首', async () => {
    facade.intents.playAll([T(1), T(2)])
    await flushed()
    facade.intents.next()
    facade.time.value = 10
    facade.intents.prev()
    expect(runtimeMock.seek).toHaveBeenCalledWith(0)         // 超 3s：重播
    facade.time.value = 1
    facade.intents.prev()
    expect(facade.queue.currentTrack?.id).toBe(1)            // ≤3s：回退
  })

  it('冷启动空队列：stop 收敛，无异常', () => {
    expect(runtimeMock.stop).toHaveBeenCalled()
    expect(facade.queue.currentTrack).toBeNull()
  })

  it('连续失败熔断：达阈值裁决 stopped，不再跳过', async () => {
    facade.intents.playAll([T(1), T(2), T(3), T(4), T(5)])
    await flushed()
    const onError = runtimeMock.on.mock.calls.find(([ev]) => ev === EngineEvent.Error)![1]
    onError(null)   // 失败 1 → 跳至 t2
    onError(null)   // 失败 2 → 跳至 t3
    onError(null)   // 失败 3 → 熔断，停在 t3
    expect(facade.queue.currentTrack?.id).toBe(3)
    expect(facade.queue.intent).toBe('pause')
    expect(facade.queue.engineState).toBe('error')
  })
})