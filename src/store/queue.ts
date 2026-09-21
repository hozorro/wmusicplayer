import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useMusicStore } from './music'
import type { EngineState, PlayIntent, PlayMode, PlayTrack } from '../player/types'
import { shuffled } from '@/utilies/general'

interface QueueState {
  tracks: PlayTrack[]
  order: number[]
  position: number
}

export const useQueueStore = defineStore('player/queue', () => {
  // —— 期望态（持久化） ——
  const queueState = ref<QueueState>({
    tracks: [],
     /** order空间： tracks的排列； sequential下恒等， shuffle下为洗牌排列 */
    order: [],
    /** order空间游标，store私有——外部只经jumpTo(track空间)进入 */
    position: 0,
  })
  const mode = ref<PlayMode>('sequential')
  const intent = ref<PlayIntent>('pause')

  // —— 实际态（不持久化；唯一写门setEngineState / setDuration) ——
  const engineState = ref<EngineState>('idle')
  const duration = ref(0)
  
  const musicStore = useMusicStore()

  // —— 派生投影：watch只订阅这些，不订阅原始集合 ——
  const trackMap = computed(() => new Map<number, PlayTrack>(queueState.value.tracks.map((track) => [track.id, track])))
  const curTrackId = computed(() => queueState.value.order[queueState.value.position] ?? null)
  const curTrack = computed(() => {
    const id = curTrackId.value
    return id ? trackMap.value.get(id) ?? null : null
  })

  const nextPosition = computed(() => {
    const len = queueState.value.order.length
    if (len === 0) return -1
    if (mode.value === 'loop-one') return queueState.value.position
    if (musicStore.params.AUTOLOOP) return (queueState.value.position + 1) % len
    return (queueState.value.position + 1) < len ? queueState.value.position + 1 : -1  // sequential和shuffle到末尾停止
  })

  const prevPosition = computed(() => {
    const len = queueState.value.order.length
    if (len === 0) return -1
    if (mode.value === 'loop-one') return queueState.value.position
    if (musicStore.params.AUTOLOOP) return (queueState.value.position - 1 + len) % len
    return (queueState.value.position - 1) >= 0 ? queueState.value.position - 1 : -1  // sequential和shuffle到开头停止
  })

  function updateQueueState(patch: Partial<QueueState>) {
    queueState.value = { ...queueState.value, ...patch }
  }

  /** ended的业务裁决 */
  function advance(): 'advanced' | 'repeated' | 'ended' {
    if (queueState.value.order.length === 0) return 'ended'
    if (mode.value === 'loop-one') return 'repeated'
    const n = nextPosition.value
    if (n === -1) return 'ended'
    queueState.value.position = n
    return 'advanced'
  }

  /** 用户推进：忽略loop-one（坏曲目跳过同样走这里，避免死循环） */
  function skipNext(): 'advanced' | 'ended' {
    const len = queueState.value.order.length
    if (len === 0) return 'ended'
    const n = queueState.value.position + 1 < len 
      ? queueState.value.position + 1 
      : musicStore.params.AUTOLOOP ? 0 : -1
    if (n === -1) return 'ended'
    queueState.value.position = n
    return 'advanced'
  }

  /** 用户回退：loop-one / 无上一首裁决 unchanged，用意图层决定重播 */
  function retreat(): 'retreated' | 'unchanged' {
    const p = prevPosition.value
    if (p === -1 || p === queueState.value.position) return 'unchanged'
    queueState.value.position = p
    return 'retreated'
  }

  /** 按当前模式重建order，保住指定曲目（track空间索引，-1 = 不保） */
  function rebuildOrder(tracks: PlayTrack[], preserveIndex: number = -1): { order: number[]; position: number } {
    const n = tracks.length
    const ids = tracks.map(t => t.id)
    let order = mode.value === 'shuffle' ? shuffled(ids) : ids
    let position = -1

    if (n === 0 || preserveIndex < -1 || preserveIndex >= n) {
      position = 0
    } else {
      const preserveId = tracks[preserveIndex].id
      position = preserveIndex >= 0 ? order.indexOf(preserveId) : 0
    }
    
    return { order, position }
  }

  /** order空间游标写入——PlayQueueController专用入口，仅改变order游标时使用，否则使用updateQueueState */
  function setPosition(p: number) {
    const len = queueState.value.order.length
    queueState.value.position = len === 0 ? 0 : Math.max(0, Math.min(p, len - 1))
  }

  /** track空间跳转——facade意图层入口，自动翻译到order空间 */
  function jumpTo(trackIndex: number) {
    const {tracks, order} = queueState.value
    console.log(trackIndex)
    const trackId = tracks[trackIndex]?.id
    console.log(trackId)
    const p = order.indexOf(trackId)
    if (p !== -1) setPosition(p)
    console.log(queueState.value.position)
  }

  function setMode(m: PlayMode) {
    if (m === mode.value) return
    const curIndex = queueState.value.tracks.findIndex(t => t.id === curTrackId.value)
    mode.value = m
    const {order, position} = rebuildOrder(queueState.value.tracks, curIndex)
    updateQueueState({ order, position })
  }

  /** 预加载供给：未来count首（不含当前，保守不跨末尾） */
  function peekNext(count: number): PlayTrack[] {
    const { tracks, order, position } = queueState.value
    const outIds = new Set<number>()
    for (let i = 1; i <= count && position + i < order.length; i++) {
      outIds.add(order[position + i])
    }
    return tracks.filter(t => outIds.has(t.id))
  }

  // ——实际态写门 ——
  function setEngineState(state: EngineState) {
    if (state !== engineState.value) engineState.value = state
  }

  function setDuration(d: number) {
    if (Number.isFinite(d) && d > 0) duration.value = d
  }

  /**
   * 持久化恢复之后的自愈，facade初始化时调用一次
   * order必须是tracks的合法排列，否则按当前模式重建
   * 冷恢复强制 intent=pause（iOS自动播放需手势）
   */
  function sanitize() {
    const {tracks, order, position} = queueState.value
    const n = tracks.length
    const valid = order.length === n
      && new Set(order).size === n
      && order.every(i => i >= 0 && i < n)
    if (!valid) {
      const {order: reOrder, position: rePosition} = rebuildOrder(queueState.value.tracks, position < n ? position : -1)
      updateQueueState({ order: reOrder, position: rePosition })
    } else {
      setPosition(position)
    }
    intent.value = 'pause'
    engineState.value = 'idle'
    duration.value = 0
  }

  return {
    queueState, mode, intent, engineState, duration,
    curTrackId, curTrack, nextPosition, prevPosition,
    updateQueueState, advance, skipNext, retreat, setPosition, jumpTo, setMode, rebuildOrder, peekNext,
    setEngineState, setDuration, sanitize
  }
}, {
  // pinia-plugin-persistedstate
  persist: { pick: ['mode']}
})

export type QueueStore = ReturnType<typeof useQueueStore>
