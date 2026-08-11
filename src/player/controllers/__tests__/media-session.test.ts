// player/controllers/__tests__/media-session.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createEmitter } from '@/shared/emitter'
import { createMediaSessionController } from '../media-session'
import { useQueueStore } from '@/store/queue'
import { PlayerEvent } from '../../events'
import type { PlayerEventMap } from '../../events'
import type { PlayerIntents } from '../../types'

const msMock = vi.hoisted(() => ({
  metadata: null as unknown,
  playbackState: 'none' as string,
  setPositionState: vi.fn(),
  setActionHandler: vi.fn(),
}))

const intents = vi.hoisted(() => ({
  play: vi.fn(), pause: vi.fn(), toggle: vi.fn(), next: vi.fn(), prev: vi.fn(),
  playAt: vi.fn(), playTrack: vi.fn(), addAndPlay: vi.fn(), playAll: vi.fn(),
  playNext: vi.fn(), playNextAll: vi.fn(), seek: vi.fn(), setVolume: vi.fn(),
})) satisfies PlayerIntents

beforeEach(() => {
  vi.stubGlobal('navigator', { mediaSession: msMock })
  vi.stubGlobal('MediaMetadata', vi.fn(function(this: unknown, init: unknown) { return init }))
  msMock.metadata = null
  msMock.playbackState = 'none'
  msMock.setPositionState.mockClear()
  msMock.setActionHandler.mockClear()
  setActivePinia(createPinia())
})

function setup() {
  const queue = useQueueStore()
  const bus = createEmitter<PlayerEventMap>()
  const time = ref(0)
  const ctrl = createMediaSessionController(queue, bus, intents, time)
  return { queue, bus, time, ctrl }
}

const handler = (action: string) =>
  msMock.setActionHandler.mock.calls.find(([a]) => a === action)![1] as MediaSessionActionHandler

describe('出站投影', () => {
  it('TrackChanged → metadata（含 artwork 类型推断）', () => {
    const { bus } = setup()
    bus.emit(PlayerEvent.TrackChanged, {
      id: 1, title: '歌', artists: [{id: 1, name: '歌手'}], album: {id: 1, title: '专辑'}, cover: '/cover.jpg',
    })
    expect(msMock.metadata).toMatchObject({
      title: '歌', artist: '歌手', album: '专辑',
      artwork: [{ src: '/cover.jpg', type: 'image/jpeg' }],
    })
  })

  it('playbackState 是 期望态 × 实际态 的合成（A35）', () => {
    const { queue, bus } = setup()
    queue.intent = 'play'
    queue.setEngineState('buffering')
    bus.emit(PlayerEvent.StateChanged, 'buffering')
    expect(msMock.playbackState).toBe('playing')      // buffering + 想播 → playing
    queue.intent = 'pause'
    queue.setEngineState('paused')
    bus.emit(PlayerEvent.StateChanged, 'paused')
    expect(msMock.playbackState).toBe('paused')       // 不想播 → 如实 paused
  })

  it('进度投影：整秒节流 + duration 回填触发', async () => {
    const { queue, time } = setup()
    queue.setDuration(180)                            // → 强制投影一次
    await nextTick()
    expect(msMock.setPositionState).toHaveBeenCalledTimes(1)
    time.value = 0.4; await nextTick()
    time.value = 0.8; await nextTick()                // 同一整秒内，不重复投影
    expect(msMock.setPositionState).toHaveBeenCalledTimes(1)
    time.value = 1.2; await nextTick()
    expect(msMock.setPositionState).toHaveBeenCalledTimes(2)
    expect(msMock.setPositionState).toHaveBeenLastCalledWith(
      expect.objectContaining({ duration: 180, position: 1.2, playbackRate: 1 }),
    )
  })
})

describe('入站指令面', () => {
  it('锁屏按键 → 同源 intents', () => {
    setup()
    handler('nexttrack')({} as MediaSessionActionDetails)
    expect(intents.next).toHaveBeenCalledOnce()
    handler('previoustrack')({} as MediaSessionActionDetails)
    expect(intents.prev).toHaveBeenCalledOnce()
  })

  it('seekto 携带时间参数', () => {
    setup()
    handler('seekto')({ seekTime: 42 } as MediaSessionActionDetails)
    expect(intents.seek).toHaveBeenCalledWith(42)
  })

  it('dispose：解绑全部 handler 并清空投影', () => {
    const { ctrl } = setup()
    ctrl.dispose()
    const nulls = msMock.setActionHandler.mock.calls.filter(([, h]) => h === null)
    expect(nulls.length).toBeGreaterThanOrEqual(8)
    expect(msMock.metadata).toBeNull()
    expect(msMock.playbackState).toBe('none')
  })
})

describe('环境降级', () => {
  it('无 mediaSession：返回无操作面，不抛异常（A36）', () => {
    vi.stubGlobal('navigator', {})
    const ctrl = createMediaSessionController(
      useQueueStore(), createEmitter<PlayerEventMap>(), intents, ref(0),
    )
    expect(ctrl.supported).toBe(false)
    expect(() => ctrl.dispose()).not.toThrow()
  })
})