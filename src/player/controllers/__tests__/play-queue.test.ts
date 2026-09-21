// player/controllers/__tests__/playlist.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useQueueStore } from '@/store/queue'
import { createPlayQueueController } from '../play-queue'
import { PlayerEvent } from '../../events'
import type { PlayerEventMap } from '../../events'
import type { Emitter } from '@/player/shared/emitter'
import type { PlayTrack } from '../../types'

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

const T = (id: number): PlayTrack => ({ id, title: `${id}`, artists: [{ id: 1, name: 't' }] })

let queue: ReturnType<typeof useQueueStore>
let playQueue: ReturnType<typeof createPlayQueueController>
let bus: Emitter<PlayerEventMap>

beforeEach(() => {
  setActivePinia(createPinia())
  queue = useQueueStore()
  bus = { emit: vi.fn(), on: vi.fn(), off: vi.fn(), clear: vi.fn() }
  playQueue = createPlayQueueController(queue, bus)
})

describe('add 边界情况', () => {
  it('空队列添加：tracks 和 order 都正确初始化', () => {
    const at = playQueue.add(T(111))
    expect(at).toBe(0)
    expect(queue.queueState.tracks.map(t => t.id)).toEqual([111])
    expect(queue.queueState.order).toEqual([111])
    expect(queue.queueState.position).toBe(0)
    expect(queue.curTrack?.id).toBe(111)
  })

  it('添加已存在曲目：返回已有位置，不重复添加', () => {
    playQueue.replace([T(111), T(222)])
    const at = playQueue.add(T(111))
    expect(at).toBe(0)
    expect(queue.queueState.tracks).toHaveLength(2)
  })

  it('shuffle 模式下添加：新曲目洗入当前之后', () => {
    playQueue.replace([T(111), T(222), T(333)])
    playQueue.setMode('shuffle')
    playQueue.add(T(444))
    expect(queue.queueState.tracks).toHaveLength(4)
    expect(queue.queueState.order).toContain(444)
  })
})

describe('addMany 边界情况', () => {
  it('空列表：返回 first=-1，added 为空', () => {
    playQueue.replace([T(111)])
    const { first, added } = playQueue.addMany([])
    expect(first).toBe(-1)
    expect(added).toEqual([])
  })

  it('空队列添加多首：全部添加，position 指向第一首', () => {
    const { first, added } = playQueue.addMany([T(111), T(222), T(333)])
    expect(first).toBe(0)
    expect(added.map(t => t.id)).toEqual([111, 222, 333])
    expect(queue.queueState.position).toBe(0)
    expect(queue.curTrack?.id).toBe(111)
  })

  it('输入列表内部去重：重复 id 只保留第一个', () => {
    const { added } = playQueue.addMany([T(111), T(111), T(222)])
    expect(added.map(t => t.id)).toEqual([111, 222])
  })
})

describe('insertNext 边界情况', () => {
  it('当前无播放曲目（空队列）：fallback 到 add', () => {
    const at = playQueue.insertNext(T(111))
    expect(at).toBe(0)
    expect(queue.queueState.tracks.map(t => t.id)).toEqual([111])
    expect(queue.curTrack?.id).toBe(111)
  })

  it('插入曲目即是当前播放曲目：返回当前位置，不重复插入', () => {
    playQueue.replace([T(111), T(222)])
    const at = playQueue.insertNext(T(111))
    expect(at).toBe(0)
    expect(queue.queueState.tracks).toHaveLength(2)
    expect(queue.curTrack?.id).toBe(111)
  })

  it('当前曲目已被移除（不在 tracks 中）：fallback 到 add', () => {
    playQueue.replace([T(111), T(222)])
    // 模拟当前曲目被外部移除的情况
    queue.updateQueueState({ tracks: [T(222)], order: [222], position: 0 })
    // 此时 curTrackId 为 222，但插入一个全新曲目
    playQueue.insertNext(T(333))
    expect(queue.queueState.tracks.map(t => t.id)).toEqual([222, 333])
  })

  it('插入已存在曲目：从原位置移除并插入当前之后', () => {
    playQueue.replace([T(111), T(222), T(333), T(444)])
    queue.jumpTo(1)  // 当前 222
    playQueue.insertNext(T(444))  // 444 已在队列末尾
    expect(queue.queueState.tracks.map(t => t.id)).toEqual([111, 222, 444, 333])
    expect(queue.curTrack?.id).toBe(222)
    // advance 应该到 444
    queue.advance()
    expect(queue.curTrack?.id).toBe(444)
  })
})

describe('insertNextMany 边界情况', () => {
  it('空列表：返回 first=-1，added 为空', () => {
    playQueue.replace([T(111)])
    const { first, added } = playQueue.insertNextMany([])
    expect(first).toBe(-1)
    expect(added).toEqual([])
  })

  it('当前无播放曲目（空队列）：fallback 到 addMany', () => {
    const { first, added } = playQueue.insertNextMany([T(111), T(222)])
    expect(first).toBe(0)
    expect(added.map(t => t.id)).toEqual([111, 222])
    expect(queue.curTrack?.id).toBe(111)
  })

  it('插入列表包含当前曲目：当前曲目位置不变，其他插入其后', () => {
    playQueue.replace([T(111), T(222), T(333)])
    queue.jumpTo(1)  // 当前 222
    playQueue.insertNextMany([T(222), T(444), T(555)])
    // 222 被跳过（从 removeSet 中删除），444 和 555 插入 222 之后
    expect(queue.queueState.tracks.map(t => t.id)).toEqual([111, 222, 444, 555, 333])
    expect(queue.curTrack?.id).toBe(222)
  })

  it('插入列表全部已存在：重新排列到当前之后', () => {
    playQueue.replace([T(111), T(222), T(333)])
    queue.jumpTo(0)  // 当前 111
    playQueue.insertNextMany([T(333), T(222)])  // 都已存在，不包含当前曲目
    // 333 和 222 被移到 111 之后
    expect(queue.queueState.tracks.map(t => t.id)).toEqual([111, 333, 222])
    expect(queue.curTrack?.id).toBe(111)
  })
})

describe('removeAt 边界情况', () => {
  it('删除最后一首且是当前曲目：position 滑入新的最后一首', () => {
    playQueue.replace([T(111), T(222), T(333)])
    queue.jumpTo(2)  // 当前 333（最后一首）
    playQueue.removeAt(2)
    expect(queue.queueState.tracks.map(t => t.id)).toEqual([111, 222])
    expect(queue.queueState.position).toBe(1)
    expect(queue.curTrack?.id).toBe(222)
  })

  it('删除非当前曲目且在当前之后：position 不变', () => {
    playQueue.replace([T(111), T(222), T(333), T(444)])
    queue.jumpTo(1)  // 当前 222
    playQueue.removeAt(3)  // 删除 444
    expect(queue.queueState.position).toBe(1)
    expect(queue.curTrack?.id).toBe(222)
  })

  it('无效索引：不报错，状态不变', () => {
    playQueue.replace([T(111), T(222)])
    playQueue.removeAt(-1)
    playQueue.removeAt(10)
    expect(queue.queueState.tracks).toHaveLength(2)
  })
})

describe('move 边界情况', () => {
  it('from 是当前播放曲目：游标跟随移动', () => {
    playQueue.replace([T(111), T(222), T(333)])
    queue.jumpTo(0)  // 当前 111
    playQueue.move(0, 2)  // 111 移到末尾
    expect(queue.queueState.tracks.map(t => t.id)).toEqual([222, 333, 111])
    expect(queue.curTrack?.id).toBe(111)
    expect(queue.queueState.position).toBe(2)
  })

  it('to 是当前播放曲目位置：当前曲目被挤走，游标跟随', () => {
    playQueue.replace([T(111), T(222), T(333)])
    queue.jumpTo(1)  // 当前 222
    playQueue.move(0, 1)  // 111 移到 222 的位置
    expect(queue.queueState.tracks.map(t => t.id)).toEqual([222, 111, 333])
    expect(queue.curTrack?.id).toBe(222)
    expect(queue.queueState.position).toBe(0)
  })

  it('from === to：无操作', () => {
    playQueue.replace([T(111), T(222)])
    playQueue.move(0, 0)
    expect(queue.queueState.tracks.map(t => t.id)).toEqual([111, 222])
  })

  it('无效索引：无操作', () => {
    playQueue.replace([T(111), T(222)])
    playQueue.move(-1, 0)
    playQueue.move(0, 10)
    expect(queue.queueState.tracks.map(t => t.id)).toEqual([111, 222])
  })

  it('shuffle 模式下 move：order 正确更新，游标跟随当前曲目', () => {
    playQueue.replace([T(111), T(222), T(333), T(444)])
    playQueue.setMode('shuffle')
    const originalCurId = queue.curTrackId
    playQueue.move(0, 3)  // 移动第一首到末尾
    expect(queue.curTrackId).toBe(originalCurId)  // 当前曲目不变
  })
})

describe('ensure 边界情况', () => {
  it('曲目已存在：返回已有位置', () => {
    playQueue.replace([T(111), T(222)])
    const at = playQueue.ensure(T(111))
    expect(at).toBe(0)
    expect(queue.queueState.tracks).toHaveLength(2)
  })

  it('曲目不存在：添加到末尾', () => {
    playQueue.replace([T(111)])
    const at = playQueue.ensure(T(222))
    expect(at).toBe(1)
    expect(queue.queueState.tracks.map(t => t.id)).toEqual([111, 222])
  })
})

describe('clear 边界情况', () => {
  it('清空后状态收敛：tracks/order 为空，position=-1', () => {
    playQueue.replace([T(111), T(222)])
    playQueue.clear()
    expect(queue.queueState.tracks).toEqual([])
    expect(queue.queueState.order).toEqual([])
    expect(queue.queueState.position).toBe(-1)
    expect(queue.curTrack).toBeNull()
  })
})

describe('addMany 去重与位置解析', () => {
  it('新旧混合：first = 第一首新曲目，added 只含新曲目', () => {
    playQueue.replace([T(111), T(222)])
    const { first, added } = playQueue.addMany([T(222), T(333), T(444), T(333)])
    expect(added.map(t => t.id)).toEqual([333, 444])
    expect(first).toBe(2)
    expect(queue.queueState.tracks.map(t => t.id)).toEqual([111, 222, 333, 444])
  })

  it('全部重复：first 落在第一首已存在曲目，added 为空', () => {
    playQueue.replace([T(111), T(222)])
    const { first, added } = playQueue.addMany([T(222), T(111)])
    expect(first).toBe(1)
    expect(added).toEqual([])
  })
})

describe('insertNext', () => {
  it('sequential：新曲目紧随当前，advance 即达', () => {
    playQueue.replace([T(111), T(222), T(333)])        // 当前 111
    playQueue.insertNext(T(444))
    expect(queue.advance()).toBe('advanced')
    expect(queue.curTrack?.id).toBe(444)
  })

  it('shuffle：同样钉在游标之后（order 空间断言）', () => {
    playQueue.replace([T(111), T(222), T(333), T(444)])
    playQueue.setMode('shuffle')
    playQueue.insertNext(T(555))
    expect(queue.queueState.order[queue.queueState.position + 1]).toBe(555)
  })

  it('已在队列：挪到游标之后而非重复插入', () => {
    playQueue.replace([T(111), T(222), T(333)])
    playQueue.insertNext(T(333))
    expect(queue.queueState.tracks).toHaveLength(3)
    expect(queue.advance()).toBe('advanced')
    expect(queue.curTrack?.id).toBe(333)
  })
  it('insertNextMany：集合连续落在当前之后，保序穿过', () => {
    playQueue.replace([T(1), T(2), T(3)])        // 当前 1
    playQueue.insertNextMany([T(7), T(8)])
    queue.advance(); expect(queue.curTrack?.id).toBe(7)
    queue.advance(); expect(queue.curTrack?.id).toBe(8)
    queue.advance(); expect(queue.curTrack?.id).toBe(2)   // 块穿完，回到原序列
})
})

describe('removeAt 游标语义（A30）', () => {
  it('删除当前：下一首原地接管', () => {
    playQueue.replace([T(111), T(222), T(333)])
    playQueue.removeAt(0)
    expect(queue.curTrack?.id).toBe(222)
    expect(queue.queueState.position).toBe(0)
  })

  it('删除当前之前的曲目：currentTrack 不受影响', () => {
    playQueue.replace([T(111), T(222), T(333)])
    queue.jumpTo(2)
    playQueue.removeAt(0)
    expect(queue.curTrack?.id).toBe(333)
  })

  it('删空：状态收敛', () => {
    playQueue.replace([T(111)])
    playQueue.removeAt(0)
    expect(queue.curTrack).toBeNull()
    expect(queue.advance()).toBe('ended')
  })
})

describe('move 与 replace', () => {
  it('sequential 下 move 改变播放顺序', () => {
    playQueue.replace([T(111), T(222), T(333)])
    playQueue.move(2, 0)                              // c 提到最前
    expect(queue.queueState.tracks.map(t => t.id)).toEqual([333, 111, 222])
    expect(queue.curTrack?.id).toBe(111)         // 游标跟随当前曲目
  })

  it('replace 去重且游标归零', () => {
    playQueue.replace([T(111), T(222)])
    queue.jumpTo(1)
    playQueue.replace([T(111), T(222)])
    expect(queue.queueState.tracks.map(t => t.id)).toEqual([111, 222])
    expect(queue.curTrack?.id).toBe(111)
  })
})

describe('事件投影', () => {
  it('QueueChanged 携带正确种类，发射点唯一', () => {
    playQueue.add(T(111))
    playQueue.clear()
    expect(bus.emit).toHaveBeenNthCalledWith(1, PlayerEvent.QueueChanged, 'add')
    expect(bus.emit).toHaveBeenNthCalledWith(2, PlayerEvent.QueueChanged, 'clear')
  })

  it('setMode 发射 ModeChanged，重复设置不发射', () => {
    playQueue.setMode('shuffle')
    playQueue.setMode('shuffle')
    expect(bus.emit).toHaveBeenCalledTimes(1)
    expect(bus.emit).toHaveBeenCalledWith(PlayerEvent.ModeChanged, 'shuffle')
  })
})