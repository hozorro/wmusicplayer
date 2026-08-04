// player/stores/__tests__/queue.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useQueueStore } from '../queue'
import type { PlayTrack } from '../../player/types'

const T = (id: number): PlayTrack => ({ id, title: `t${id}`, artists: ['t'] })

function seed(store: ReturnType<typeof useQueueStore>, ids: number[]) {
  store.tracks = ids.map(T)
  store.rebuildOrder(ids.length > 0 ? 0 : -1)
}

beforeEach(() => setActivePinia(createPinia()))

describe('advance 策略算术', () => {
  it('sequential 到末尾裁决 ended', () => {
    const q = useQueueStore(); seed(q, [111, 222])
    expect(q.advance()).toBe('advanced')
    expect(q.currentTrack?.id).toBe(222)
    expect(q.advance()).toBe('ended')
  })

  it('loop-all 末尾回卷', () => {
    const q = useQueueStore(); seed(q, [111, 222]); q.setMode('loop-all')
    q.advance()
    expect(q.advance()).toBe('advanced')
    expect(q.currentTrack?.id).toBe(111)
  })

  it('loop-one 原地重复，游标不动', () => {
    const q = useQueueStore(); seed(q, [111, 222]); q.setMode('loop-one')
    expect(q.advance()).toBe('repeated')
    expect(q.currentTrack?.id).toBe(111)
  })

  it('空队列裁决 ended', () => {
    const q = useQueueStore()
    expect(q.advance()).toBe('ended')
  })
})

describe('模式切换保住当前曲目', () => {
  it('sequential → shuffle → sequential 往返，currentTrack 不变', () => {
    const q = useQueueStore(); seed(q, [111, 222, 333, 444])
    q.jumpTo(2)
    expect(q.currentTrack?.id).toBe(333)
    q.setMode('shuffle')
    expect(q.currentTrack?.id).toBe(333)      // 洗牌后当前曲目钉在游标上
    expect(q.order[q.position]).toBe(2)
    q.setMode('sequential')
    expect(q.currentTrack?.id).toBe(333)
    expect(q.order).toEqual([0, 1, 2, 3])    // 恢复恒等排列
  })
})

describe('jumpTo 跨空间翻译', () => {
  it('shuffle 下按 track 索引定位', () => {
    const q = useQueueStore(); seed(q, [111, 222, 333]); q.setMode('shuffle')
    q.jumpTo(1)
    expect(q.currentTrack?.id).toBe(222)
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
    q.intent = 'play'; q.order = [9, -1, 99]
    q.sanitize()
    expect(new Set(q.order)).toEqual(new Set([0, 1, 2]))
    expect(q.intent).toBe('pause')
    expect(q.engineState).toBe('idle')
  })
})