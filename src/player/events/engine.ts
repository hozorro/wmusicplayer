import type { EngineState } from '../types'

/**
 * 引擎事件：runtime → controller 的翻译层输出
 * 
 * 事件值命名`engine:<kebab-case>`：字面量联合没有enum的名义类型隔离
 * engine: / player: 命名空间是防止两层事件混用的唯一屏障
 */
export const EngineEvent = {
  /** natinve play/pause/waiting/playing → 规范化为 EngineState */
  StateChanged: 'engine:state-changed',
  /** 自然播完。业务予以（推进/单曲循环/停止）由controller裁决，runtime不决策 */
  Ended: 'engine:ended',
  /** 高频（4Hz+）：currentTime 秒。消费者写入旁路 ref，不进入store */
  TimeUpdate: 'engine:time-update',
  DurationChange: 'engine:duration-change',
  /** el.error 快照，可能为null */
  Error: 'engine:error',
  /** seek完成。暂停状态下timeupdate不触发，时间UI靠它回填 */
  Seeked: 'engine:seeked',
} as const

export type EngineEvent = (typeof EngineEvent)[keyof typeof EngineEvent]

/** 引擎事件载荷契约 */
export interface EngineEventMap {
  [EngineEvent.StateChanged]: EngineState
  [EngineEvent.Ended]: void
  [EngineEvent.TimeUpdate]: number
  [EngineEvent.DurationChange]: number
  [EngineEvent.Error]: MediaError | null
  [EngineEvent.Seeked]: number
}
