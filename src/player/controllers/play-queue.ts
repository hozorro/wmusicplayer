import { shuffled } from "@/utilies/general";
import { PlayerEvent } from "../events";
import type { PlayerEventMap } from "../events";
import type { Emitter } from "@/player/shared/emitter";
import type { PlayMode, PlayTrack } from "../types";
import type { QueueStore } from "@/store/queue";

/**
 * 播放清单控制器：tracks / order 唯一写入者
 * 对外契约：写操作返回解析后的track空间位置，消费方零计算
 * 内容变更一律按id对账重建order并保住播放游标
 */
export function createPlayQueueController(queue: QueueStore, bus: Emitter<PlayerEventMap>) {
  function dedupe(list: PlayTrack[]): PlayTrack[] {
    const seen =new Set<number>()
    return list.filter(t => seen.has(t.id) ? false : (seen.add(t.id), true))
  }
  
  /** 默认添加到最后，并返回在tracks中的位置，注意不是order中的位置 */
  function add(track: PlayTrack): number {
    const {tracks, order, position} = queue.queueState

    const existing = tracks.findIndex(t => t.id === track.id)
    if (existing !== -1) return existing
    
    let newTracks = [...tracks, track]
    let newOrder = [...order]

    if (newOrder.length > 0 && queue.mode === 'shuffle') {
      const start = position + 1
      const at = start + Math.floor(Math.random() * (newOrder.length - start + 1))
      newOrder.splice(at, 0, track.id)
    } else {
      newOrder.push(track.id)
    }
    queue.updateQueueState({ tracks: newTracks, order: newOrder })
    
    bus.emit(PlayerEvent.QueueChanged, 'add')
    console.log(queue.queueState)
    return queue.queueState.tracks.length - 1
  }

  /** 添加多个track到队列末尾，返回第一个添加的track在tracks中的位置，注意不是order中的位置 */
  function addMany(list: PlayTrack[]): { first: number; added: PlayTrack[] } {
    if (list.length === 0) return { first: -1, added: [] }
    const clean = dedupe(list)

    const {tracks, order, position} = queue.queueState
    const existingIds = new Set(tracks.map(t => t.id))
    const fresh = clean.filter(t => !existingIds.has(t.id))

    if (fresh.length === 0) return { first: tracks.findIndex(t => t.id === clean[0].id), added: [] }
    
    let newTracks = [...tracks, ...fresh]
    let newOrder = [...order]

    const freshIds = fresh.map(t => t.id)
    if (queue.mode === 'shuffle') {
      if (newOrder.length > 0) {
        const start = position + 1
        for (const id of freshIds) {
          const at = start + Math.floor(Math.random() * (newOrder.length - start + 1))
          newOrder.splice(at, 0, id)
        }
      } else {
        newOrder.push(...shuffled(freshIds))
      }
    } else {
      newOrder.push(...freshIds)
    }
    queue.updateQueueState({ tracks: newTracks, order: newOrder })
    
    console.log(queue.queueState)
    bus.emit(PlayerEvent.QueueChanged, 'add')
    return { first: queue.queueState.tracks.length - fresh.length, added: fresh }
  }

  /** 下一首播放：已在队列则挪到当前播放曲目之后，否则插入当前播放曲目之后 */
  function insertNext(track: PlayTrack): number {
    const curId = queue.curTrackId
    // 如果当前播放曲目不存在，则fallback至add，直接添加到队列末尾
    if (!curId) return add(track)
    
    const {tracks, order} = queue.queueState
    
    const existing = tracks.findIndex(t => t.id === track.id)
    // 如果当前播放曲目存在且与要插入的曲目相同，则返回当前曲目的位置
    if (track.id === curId) return existing

    // 如果当前播放曲目不存在于队列中，则添加到队列末尾（适用于当前曲目被移除的情况）
    const curTrackIndex = tracks.findIndex(t => t.id === curId)
    if (curTrackIndex === -1) return add(track)

    let newTracks = [...tracks]
    let trackObj = track
    if (existing !== -1) {
      // 如果要添加的曲目已存在队列中，则首先移除它
      trackObj = newTracks[existing]
      newTracks.splice(existing, 1)
    }
    // 插入当前播放曲目之后
    const curIndex = newTracks.findIndex(t => t.id === curId)
    const insertAt = curIndex >= 0 ? curIndex + 1 : newTracks.length
    newTracks.splice(insertAt, 0, trackObj)

    let newOrder: number[]
    let newPosition: number
    if (queue.mode === 'shuffle') {
      // 如果添加的曲目存在于order中，首先移除它
      newOrder = order.filter((id => id !== track.id))
      const curOrderIndex = order.indexOf(curId)
      if (curOrderIndex === -1) {
        // 不存在当前播放曲目， 插入order末尾，newPosition 保留在原位置
        newOrder = [...order, track.id]
      } else {
        newOrder.splice(curOrderIndex + 1, 0, track.id)
      }
      newPosition = curOrderIndex
    } else {
      // 找到当前曲目在新tracks中的索引
      const newCurIndex = newTracks.findIndex(t => t.id === curId)
      const { order:reOrder, position: rePosition } = queue.rebuildOrder(newTracks, newCurIndex)
      newOrder = reOrder
      newPosition = rePosition
    }
    queue.updateQueueState({ tracks: newTracks, order: newOrder, position: newPosition })
    console.log(queue.queueState)
    bus.emit(PlayerEvent.QueueChanged, existing !== -1 ? 'move' : 'insert')
    return insertAt
  }

  /** 下一首播放：插入当前播放曲目之后，已在队列则先移除 */
  function insertNextMany(list: PlayTrack[]): { first: number; added: PlayTrack[] } {
    if (list.length === 0) return { first: -1, added: [] }

    // 如果当前播放曲目不存在，则fallback至addMany，直接添加到队列末尾
    const curId = queue.curTrackId
    if (!curId) return addMany(list)
    
    const clean = dedupe(list)
    // 过滤掉当前曲目，避免重复插入
    const toInsert = clean.filter(t => t.id !== curId)
    const ids = toInsert.map(t => t.id)
    
    const removeSet = new Set(ids)

    const {tracks, order} = queue.queueState

    let newTracks: PlayTrack[]
    newTracks = tracks.filter(t => !removeSet.has(t.id))
    const curIndex = newTracks.findIndex(t => t.id === curId)
    const insertAt = curIndex >= 0 ? curIndex + 1 : newTracks.length
    newTracks.splice(insertAt, 0, ...toInsert)

    let newOrder: number[]
    let newPosition: number
    if (queue.mode === 'shuffle') {
      newOrder = order.filter(id => !removeSet.has(id))
      newPosition = newOrder.findIndex(id => id === curId)
      const insertOrderAt = newPosition >= 0 ? newPosition + 1 : newOrder.length
      newOrder.splice(insertOrderAt, 0, ...shuffled(ids))
    } else {
      // 找到当前曲目在新tracks中的索引
      const newCurIndex = newTracks.findIndex(t => t.id === curId)
      const { order:reOrder, position: rePosition } = queue.rebuildOrder(newTracks, newCurIndex)
      newOrder = reOrder
      newPosition = rePosition
    }

    const existingIds = new Set(queue.queueState.tracks.map(t => t.id))
    const fresh = toInsert.filter(t => !existingIds.has(t.id))
    
    queue.updateQueueState({ tracks: newTracks, order: newOrder, position: newPosition })
    console.log(queue.queueState)
    bus.emit(PlayerEvent.QueueChanged, 'add')
    return { first: insertAt, added: fresh }
  }

  function ensure(track: PlayTrack): number {
    const i = queue.queueState.tracks.findIndex(t => t.id === track.id)
    return i !== -1 ? i : add(track)
  }

  function removeAt(index: number): void {
    if (index < 0 || index >= queue.queueState.tracks.length) return
    
    const {tracks, order, position} = queue.queueState
    let newTracks: PlayTrack[] = [...tracks]
    let newOrder: number[]
    let newPosition: number
    const id = tracks[index].id
    newTracks.splice(index, 1)
    newOrder = order.filter(i => i !== id)
    // position 原位滑入，如果当前播放曲目被移除，则滑入下一个曲目，如果当前曲目是最后一首且被移除，则滑入最新的最后一首
    newPosition = position >= newOrder.length ? newOrder.length - 1 : position
    queue.updateQueueState({ tracks: newTracks, order: newOrder, position: newPosition })
    console.log(queue.queueState)
    bus.emit(PlayerEvent.QueueChanged, 'remove')
  }

  function move(from: number, to: number): void {
    const {tracks, order} = queue.queueState
    const curId = queue.curTrackId
    const n = tracks.length
    if (from === to || from < 0 || from >= n || to < 0 || to >= n) return
    const next = [...tracks]
    const [t] = next.splice(from, 1)
    next.splice(to, 0, t)

    let newOrder: number[]
    let newPosition: number
    const fromId = tracks[from].id
    const toId = tracks[to].id
    if (queue.mode === 'shuffle') {
      newOrder = order.filter((id, _) => id !== fromId)
      newOrder.splice(newOrder.indexOf(toId), 0, fromId)
      newPosition = curId ? newOrder.findIndex(id => id === curId) : -1
    } else {
      // 找到当前曲目在新tracks中的索引
      const newCurIndex = curId ? next.findIndex(t => t.id === curId) : -1
      const { order:reOrder, position: rePosition } = queue.rebuildOrder(next, newCurIndex)
      newOrder = reOrder
      newPosition = rePosition
    }
    queue.updateQueueState({ tracks: next, order: newOrder, position: newPosition })

    console.log(queue.queueState)
    bus.emit(PlayerEvent.QueueChanged, 'move')
  }

  /** 整体替换：新清单从第0首开始，不复用旧游标 */
  function replace(list: PlayTrack[]): void {
    const clean = dedupe(list)
    const {order,position} = queue.rebuildOrder(clean, clean.length > 0 ? 0 : -1)
    queue.updateQueueState({ tracks: clean, order, position })

    console.log(queue.queueState)
    bus.emit(PlayerEvent.QueueChanged, 'replace')
  }

  function clear(): void {
    queue.updateQueueState({ tracks: [], order: [], position: -1 })
    bus.emit(PlayerEvent.QueueChanged, 'clear')
  }

  function setMode(m: PlayMode): void {
    if (queue.mode === m) return
    queue.setMode(m)
    bus.emit(PlayerEvent.ModeChanged, m)
  }

  return { add, addMany, insertNext, insertNextMany, ensure, removeAt, move, replace, clear, setMode }
}

export type PlayQueueController = ReturnType<typeof createPlayQueueController>
