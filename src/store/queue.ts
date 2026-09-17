import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useMusicStore } from './music'
import { shuffled } from '@/utilies/general'
import type { EngineState, PlayIntent, PlayMode, PlayTrack } from '../player/types'

export const useQueueStore = defineStore('player/queue', () => {
  // —— 期望态（持久化） ——
  const tracks = ref<PlayTrack[]>([])
  /** order空间： tracks的排列； sequential下恒等， shuffle下为洗牌排列 */
  const order = ref<number[]>([])
  /** order空间游标，store私有——外部只经jumpTo(track空间)进入 */
  const position = ref(0)
  const mode = ref<PlayMode>('sequential')
  const intent = ref<PlayIntent>('pause')

  // —— 实际态（不持久化；唯一写门setEngineState / setDuration) ——
  const engineState = ref<EngineState>('idle')
  const duration = ref(0)
  
  const musicStore = useMusicStore()

  // —— 派生投影：watch只订阅这些，不订阅原始集合 ——
  const currentIndex = computed(() => order.value[position.value] ?? -1)
  const currentTrack = computed(() => tracks.value[currentIndex.value] ?? null)

  const nextPosition = computed(() => {
    const len = order.value.length
    if (len === 0) return -1
    if (mode.value === 'loop-one') return position.value
    if (musicStore.params.AUTOLOOP) return (position.value + 1) % len
    return (position.value + 1) < len ? position.value + 1 : -1  // sequential和shuffle到末尾停止
  })

  const prevPosition = computed(() => {
    const len = order.value.length
    if (len === 0) return -1
    if (mode.value === 'loop-one') return position.value
    if (musicStore.params.AUTOLOOP) return (position.value - 1 + len) % len
    return (position.value - 1) >= 0 ? position.value - 1 : -1  // sequential和shuffle到开头停止
  })

  /** ended的业务裁决 */
  function advance(): 'advanced' | 'repeated' | 'ended' {
    if (order.value.length === 0) return 'ended'
    if (mode.value === 'loop-one') return 'repeated'
    const n = nextPosition.value
    if (n === -1) return 'ended'
    position.value = n
    return 'advanced'
  }

  /** 用户推进：忽略loop-one（坏曲目跳过同样走这里，避免死循环） */
  function skipNext(): 'advanced' | 'ended' {
    const len = order.value.length
    if (len === 0) return 'ended'
    const n = position.value + 1 < len 
      ? position.value + 1 
      : musicStore.params.AUTOLOOP ? 0 : -1
    if (n === -1) return 'ended'
    position.value = n
    return 'advanced'
  }

  /** 用户回退：loop-one / 无上一首裁决 unchanged，又意图层决定重播 */
  function retreat(): 'retreated' | 'unchanged' {
    const p = prevPosition.value
    if (p === -1 || p === position.value) return 'unchanged'
    position.value = p
    return 'retreated'
  }

  /** order空间游标写入——PlaylistController专用入口 */
  function setPosition(p: number) {
    const len = order.value.length
    position.value = len === 0 ? 0 : Math.max(0, Math.min(p, len - 1))
  }

  /** track空间跳转——facade意图层入口，自动翻译到order空间 */
  function jumpTo(trackIndex: number) {
    const p = order.value.indexOf(trackIndex)
    if (p !== -1) setPosition(p)
  }

  function setMode(m: PlayMode) {
    if (m === mode.value) return
    const cur = currentIndex.value
    mode.value = m
    rebuildOrder(cur)
  }

  /** 按当前模式重建order，保住指定曲目（track空间索引，-1 = 不保） */
  function rebuildOrder(preserveIndex: number = -1) {
    const n = tracks.value.length
    if (n === 0 || preserveIndex < -1 || preserveIndex >= n) {
      order.value = n === 0 ? [] : buildOrder(n, -1)
      position.value = 0
      return
    }
    order.value = buildOrder(n, preserveIndex)
    position.value = preserveIndex >= 0 ? order.value.indexOf(preserveIndex) : 0
  }

  function buildOrder(n: number, preserveIndex: number): number[] {
    const all = Array.from({ length: n }, (_, i) => i)
    if (mode.value !== 'shuffle') return all
    const rest = shuffled(all.filter(i => i !== preserveIndex))
    return preserveIndex >= 0 ? [preserveIndex, ...rest] : rest
  }

  /** 预加载供给：未来count首（不含当前，保守不跨末尾） */
  function peekNext(count: number): PlayTrack[] {
    const out: PlayTrack[] = []
    for (let i = 1; i <= count && position.value + i < order.value.length; i++) {
      const t = tracks.value[order.value[position.value + i]]
      if (t) out.push(t)
    }
    return out
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
    const n = tracks.value.length
    const valid = order.value.length === n
      && new Set(order.value).size === n
      && order.value.every(i => i >= 0 && i < n)
    if (!valid) rebuildOrder(position.value < n ? position.value : -1)
    else setPosition(position.value)
    intent.value = 'pause'
    engineState.value = 'idle'
    duration.value = 0
  }

  return {
    tracks, order, position, mode, intent, engineState, duration,
    currentIndex, currentTrack, nextPosition, prevPosition,
    advance, skipNext, retreat, setPosition, jumpTo, setMode, rebuildOrder, peekNext,
    setEngineState, setDuration, sanitize
  }
}, {
  // pinia-plugin-persistedstate
  persist: { pick: ['tracks', 'order', 'position', 'mode']}
})

export type QueueStore = ReturnType<typeof useQueueStore>
