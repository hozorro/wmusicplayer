// player/controllers/__tests__/playlist.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useQueueStore } from '@/store/queue'
import { createPlayQueueController } from '../play-queue'
import { PlayerEvent } from '../../events'
import type { PlayerEventMap } from '../../events'
import type { Emitter } from '@/shared/emitter'
import type { PlayTrack } from '../../types'

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

describe('addMany 去重与位置解析', () => {
  it('新旧混合：first = 第一首新曲目，added 只含新曲目', () => {
    playQueue.replace([T(111), T(222)])
    const { first, added } = playQueue.addMany([T(222), T(333), T(444), T(333)])
    expect(added.map(t => t.id)).toEqual([333, 444])
    expect(first).toBe(2)
    expect(queue.tracks.map(t => t.id)).toEqual([111, 222, 333, 444])
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
    expect(queue.currentTrack?.id).toBe(444)
  })

  it('shuffle：同样钉在游标之后（order 空间断言）', () => {
    playQueue.replace([T(111), T(222), T(333), T(444)])
    playQueue.setMode('shuffle')
    playQueue.insertNext(T(555))
    const xIdx = queue.tracks.findIndex(t => t.id === 555)
    expect(queue.order[queue.position + 1]).toBe(xIdx)
  })

  it('已在队列：挪到游标之后而非重复插入', () => {
    playQueue.replace([T(111), T(222), T(333)])
    playQueue.insertNext(T(333))
    expect(queue.tracks).toHaveLength(3)
    expect(queue.advance()).toBe('advanced')
    expect(queue.currentTrack?.id).toBe(333)
  })
  it('insertNextMany：集合连续落在当前之后，保序穿过', () => {
    playQueue.replace([T(1), T(2), T(3)])        // 当前 1
    playQueue.insertNextMany([T(7), T(8)])
    queue.advance(); expect(queue.currentTrack?.id).toBe(7)
    queue.advance(); expect(queue.currentTrack?.id).toBe(8)
    queue.advance(); expect(queue.currentTrack?.id).toBe(2)   // 块穿完，回到原序列
})
})

describe('removeAt 游标语义（A30）', () => {
  it('删除当前：下一首原地接管', () => {
    playQueue.replace([T(111), T(222), T(333)])
    playQueue.removeAt(0)
    expect(queue.currentTrack?.id).toBe(222)
    expect(queue.position).toBe(0)
  })

  it('删除当前之前的曲目：currentTrack 不受影响', () => {
    playQueue.replace([T(111), T(222), T(333)])
    queue.jumpTo(2)
    playQueue.removeAt(0)
    expect(queue.currentTrack?.id).toBe(333)
  })

  it('删空：状态收敛', () => {
    playQueue.replace([T(111)])
    playQueue.removeAt(0)
    expect(queue.currentTrack).toBeNull()
    expect(queue.advance()).toBe('ended')
  })
})

describe('move 与 replace', () => {
  it('sequential 下 move 改变播放顺序', () => {
    playQueue.replace([T(111), T(222), T(333)])
    playQueue.move(2, 0)                              // c 提到最前
    expect(queue.tracks.map(t => t.id)).toEqual([333, 111, 222])
    expect(queue.currentTrack?.id).toBe(111)         // 游标跟随当前曲目
  })

  it('replace 去重且游标归零', () => {
    playQueue.replace([T(111), T(222)])
    queue.jumpTo(1)
    playQueue.replace([T(111), T(222)])
    expect(queue.tracks.map(t => t.id)).toEqual([111, 222])
    expect(queue.currentTrack?.id).toBe(111)
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