// player/stores/__tests__/queue.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useQueueStore } from '../queue'
import { useMusicStore } from '../music'
import type { PlayTrack } from '../../player/types'

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

const T = (id: number): PlayTrack => ({ id, title: `t${id}`, artists: [{ id: 1, name: 't' }] })

function seed(store: ReturnType<typeof useQueueStore>, ids: number[]) {
  const tracks = ids.map(T)
  const { order, position } = store.rebuildOrder(tracks, ids.length > 0 ? 0 : -1)
  store.updateQueueState({ tracks, order, position })
}

beforeEach(() => {
  setActivePinia(createPinia())
  // 重置 AUTOLOOP 为默认值 true
  const musicStore = useMusicStore()
  musicStore.params.AUTOLOOP = true
})

describe('advance 策略算术', () => {
  it('sequential + AUTOLOOP=false 到末尾裁决 ended', () => {
    const musicStore = useMusicStore()
    musicStore.params.AUTOLOOP = false
    const q = useQueueStore(); seed(q, [111, 222])
    expect(q.advance()).toBe('advanced')
    expect(q.curTrack?.id).toBe(222)
    expect(q.advance()).toBe('ended')
  })

  it('sequential + AUTOLOOP=true 末尾回卷', () => {
    const q = useQueueStore(); seed(q, [111, 222])
    q.advance()
    expect(q.advance()).toBe('advanced')
    expect(q.curTrack?.id).toBe(111)
  })

  it('shuffle + AUTOLOOP=true 末尾回卷', () => {
    const q = useQueueStore(); seed(q, [111, 222, 333]); q.setMode('shuffle')
    q.setPosition(q.queueState.order.length - 1)  // 移到 order 空间末尾
    const lastTrackId = q.curTrack?.id
    expect(q.advance()).toBe('advanced')
    expect(q.queueState.position).toBe(0)  // 回卷到开头
    expect(q.curTrack?.id).not.toBe(lastTrackId)
  })

  it('shuffle + AUTOLOOP=false 到末尾裁决 ended', () => {
    const musicStore = useMusicStore()
    musicStore.params.AUTOLOOP = false
    const q = useQueueStore(); seed(q, [111, 222, 333]); q.setMode('shuffle')
    q.setPosition(q.queueState.order.length - 1)
    expect(q.advance()).toBe('ended')
  })

  it('loop-one 原地重复，游标不动', () => {
    const q = useQueueStore(); seed(q, [111, 222]); q.setMode('loop-one')
    expect(q.advance()).toBe('repeated')
    expect(q.curTrack?.id).toBe(111)
  })

  it('空队列裁决 ended', () => {
    const q = useQueueStore()
    expect(q.advance()).toBe('ended')
  })
})

describe('skipNext 策略', () => {
  it('sequential + AUTOLOOP=false 到末尾返回 ended', () => {
    const musicStore = useMusicStore()
    musicStore.params.AUTOLOOP = false
    const q = useQueueStore(); seed(q, [111, 222])
    q.skipNext()
    expect(q.skipNext()).toBe('ended')
  })

  it('sequential + AUTOLOOP=true 末尾回卷到开头', () => {
    const q = useQueueStore(); seed(q, [111, 222])
    q.skipNext()
    expect(q.skipNext()).toBe('advanced')
    expect(q.curTrack?.id).toBe(111)
  })

  it('loop-one 模式下 skipNext 也正常推进（忽略 loop-one）', () => {
    const q = useQueueStore(); seed(q, [111, 222]); q.setMode('loop-one')
    expect(q.skipNext()).toBe('advanced')
    expect(q.curTrack?.id).toBe(222)
  })
})

describe('retreat 策略', () => {
  it('sequential + AUTOLOOP=false 到开头返回 unchanged', () => {
    const musicStore = useMusicStore()
    musicStore.params.AUTOLOOP = false
    const q = useQueueStore(); seed(q, [111, 222])
    expect(q.retreat()).toBe('unchanged')
  })

  it('sequential + AUTOLOOP=true 开头回卷到末尾', () => {
    const q = useQueueStore(); seed(q, [111, 222])
    expect(q.retreat()).toBe('retreated')
    expect(q.curTrack?.id).toBe(222)
  })
})

describe('模式切换保住当前曲目', () => {
  it('sequential → shuffle → sequential 往返，curTrack 不变', () => {
    const q = useQueueStore(); seed(q, [111, 222, 333, 444])
    q.jumpTo(2)
    expect(q.curTrack?.id).toBe(333)
    q.setMode('shuffle')
    expect(q.curTrack?.id).toBe(333)      // 洗牌后当前曲目钉在游标上
    expect(q.queueState.order[q.queueState.position]).toBe(333)
    q.setMode('sequential')
    expect(q.curTrack?.id).toBe(333)
    expect(q.queueState.order).toEqual([111, 222, 333, 444])    // 恢复恒等排列（id数组）
  })
})

describe('jumpTo 跨空间翻译', () => {
  it('shuffle 下按 track 索引定位', () => {
    const q = useQueueStore(); seed(q, [111, 222, 333]); q.setMode('shuffle')
    q.jumpTo(1)
    expect(q.curTrack?.id).toBe(222)
  })
})

describe('peekNext', () => {
  it('返回未来 N 首，不含当前，不跨末尾', () => {
    const q = useQueueStore(); seed(q, [111, 222, 333, 444])
    expect(q.peekNext(2).map(t => t.id)).toEqual([222, 333])
    q.jumpTo(3)
    expect(q.peekNext(5)).toEqual([])
  })
})

describe('sanitize 自愈', () => {
  it('修复非法 order，冷恢复强制 pause', () => {
    const q = useQueueStore(); seed(q, [111, 222, 333])
    q.intent = 'play'; q.queueState.order = [9, -1, 99]
    q.sanitize()
    expect(new Set(q.queueState.order)).toEqual(new Set([111, 222, 333]))
    expect(q.intent).toBe('pause')
    expect(q.engineState).toBe('idle')
  })
})
