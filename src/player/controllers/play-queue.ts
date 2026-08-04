import { shuffled } from "@/utilies/general";
import { PlayerEvent } from "../events";
import type { PlayerEventMap, QueueChangeType } from "../events";
import type { Emitter } from "@/shared/emitter";
import type { PlayMode, PlayTrack } from "../types";
import type { QueueStore } from "../../store/queue";

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

  /**
   * 内容变更统一落点：
   * - sequential： order恒等，播放顺序 = 展示顺序（move直接生效）
   * - shuffle： 按id保住既有播放序列，新区莫洗入末尾
   * - 当前曲目被删：游标原位滑入（下一首原地接管），不归零
   */
  function commit(
    kind: QueueChangeType, 
    next: PlayTrack[], 
    opts?: { 
      insertAfterCurrent?: number;
      blockAfterCurrent?: number[]
    }) {
    const currentId = queue.currentTrack?.id ?? null
    const oldOrderIds = queue.order.map(i => queue.tracks[i]?.id).filter((id): id is number => id !==undefined)
    const indexById = new Map(next.map((t, i) => [t.id, i]))

    let newOrder: number[]
    if (queue.mode === 'shuffle') {
      const preserved = oldOrderIds.map(id => indexById.get(id)).filter((i): i is number => i !== undefined)
      const inOrder = new Set(preserved)
      newOrder = [...preserved, ...shuffled(next.flatMap((_, i) => inOrder.has(i) ? [] : [i]))]
    } else {
      newOrder = next.map((_, i) => i)
    }

    // insertNext特例：目标曲目贴到当前游标之后
    if (opts?.insertAfterCurrent && currentId !== null) {
      const target = indexById.get(opts.insertAfterCurrent)
      const anchor = indexById.get(currentId)
      if (target !== undefined && anchor !== undefined) {
        const pos = newOrder.indexOf(target)
        const anchorPos = newOrder.indexOf(anchor)
        if (pos !== -1 && pos !== anchorPos && pos !== anchorPos + 1) {
          newOrder.splice(pos, 1)
          newOrder.splice(anchorPos + 1, 0, target)
        }
      }
    }
    if (opts?.blockAfterCurrent?.length && currentId !== null) {
      const anchor = indexById.get(currentId)
      if (anchor !== undefined) {
        const blockIds = new Set(opts.blockAfterCurrent)
        const block = newOrder.filter(i => blockIds.has(next[i].id))
        const rest = newOrder.filter(i => !blockIds.has(next[i].id))
        const anchorPos = newOrder.indexOf(anchor)
        if (block.length > 0 && anchorPos !== -1) {
          newOrder = [...rest.slice(0, anchorPos + 1), ...block, ...rest.slice(anchorPos + 1)]
        }
      }
    }

    // 游标定位： 当前曲目仍在 -> 复用； 已被删除 -> 原位滑入旧位置
    const anchorPos = currentId !== null ? oldOrderIds.indexOf(currentId) : -1
    const currentIdx = currentId !== null ? indexById.get(currentId) : undefined
    const newPos = currentIdx !== undefined 
      ? newOrder.indexOf(currentIdx) 
      : anchorPos != -1 ? Math.min(anchorPos, Math.max(newOrder.length - 1)) : 0
    
    queue.tracks = next
    queue.order = newOrder
    queue.setPosition(newPos)
    bus.emit(PlayerEvent.QueueChanged, kind)
  }

  function add(track: PlayTrack): number {
    const existing = queue.tracks.findIndex(t => t.id === track.id)
    if (existing !== -1) return existing
    // 默认添加到最后，并返回在tracks中的位置，注意不是order中的位置
    commit('add', [...queue.tracks, track])
    return queue.tracks.length - 1
  }

  function addMany(list: PlayTrack[]): { first: number; added: PlayTrack[] } {
    if (list.length === 0) return { first: -1, added: [] }
    const clean = dedupe(list)
    const existingIds = new Set(queue.tracks.map(t => t.id))
    const fresh = clean.filter(t => !existingIds.has(t.id))
    if (fresh.length === 0) return { first: queue.tracks.findIndex(t => t.id === clean[0].id), added: [] }
    commit('add', [...queue.tracks, ...fresh])
    return { first: queue.tracks.length - fresh.length, added: fresh }
  }

  /** 下一首播放：已在队列则挪到游标之后，否则插入 */
  function insertNext(track: PlayTrack): number {
    const existing = queue.tracks.findIndex(t => t.id === track.id)
    if (existing !== -1) {
      commit('move', queue.tracks, { insertAfterCurrent: track.id })
      return existing
    }
    commit('insert', [...queue.tracks, track], { insertAfterCurrent: track.id})
    return queue.tracks.length - 1
  }

  function insertNextMany(list: PlayTrack[]): { first: number; added: PlayTrack[] } {
    if (list.length === 0) return { first: -1, added: [] }
    const clean = dedupe(list)
    const existingIds = new Set(queue.tracks.map(t => t.id))
    const fresh = clean.filter(t => !existingIds.has(t.id))
    if (fresh.length === 0) return { first: queue.tracks.findIndex(t => t.id === clean[0].id), added: [] }
    commit('insert', [...queue.tracks, ...fresh], { blockAfterCurrent: fresh.map(t => t.id) })
    return { first: queue.tracks.length - fresh.length, added: fresh }
  }

  function ensure(track: PlayTrack): number {
    const i = queue.tracks.findIndex(t => t.id === track.id)
    return i !== -1 ? i : add(track)
  }

  function removeAt(index: number): void {
    if (index < 0 || index >= queue.tracks.length) return
    commit('remove', queue.tracks.filter((_, i) => i !== index))
  }

  function move(from: number, to: number): void {
    const n = queue.tracks.length
    if (from === to || from < 0 || from >= n || to < 0 || to >= n) return
    const next = [...queue.tracks]
    const [t] = next.splice(from, 1)
    next.splice(to, 0, t)
    commit('move', next)
  }

  /** 整体替换：新清单从第0首开始，不复用旧游标 */
  function replace(list: PlayTrack[]): void {
    const clean = dedupe(list)
    queue.tracks = clean
    queue.rebuildOrder(clean.length > 0 ? 0 : -1)
    bus.emit(PlayerEvent.QueueChanged, 'replace')
  }

  function clear(): void {
    commit('clear', [])
  }

  function setMode(m: PlayMode): void {
    if (queue.mode === m) return
    queue.setMode(m)
    bus.emit(PlayerEvent.ModeChanged, m)
  }

  return { add, addMany, insertNext, insertNextMany, ensure, removeAt, move, replace, clear, setMode }
}

export type PlayQueueController = ReturnType<typeof createPlayQueueController>
