import type { EngineState, PlayMode, PlayTrack } from '../types'

/**
 * 播放器事件：状态迁移 → 外围消费者的投影
 * 每个事件的唯一发射点已在注释中钉住，实现阶段不得旁路发射
 */
export const PlayerEvent = {
  /** 唯一发射点：PlaybackController.syncTrack载入成功后 */
  TrackChanged: 'player:track-changed',
  /** 唯一发射点：EngineState迁移watch */
  StateChanged: 'player:state-changed',
  /** 唯一发射点：PlaylistController各变更方法 */
  QueueChanged: 'player:queue-changed',
  ModeChanged: 'player:mode-changed',
  /** 唯一发射点：PlaybackController.handleError。事件描述事实，含处置结果 */
  PlaybackError: 'player:playback-error',
} as const

export type PlayerEvent = (typeof PlayerEvent)[keyof typeof PlayerEvent]

/** 队列变更种类——事件自描述，消费者可忽略 */
export type QueueChangeType = 'add' | 'insert' | 'remove' | 'move' | 'replace' | 'clear'

export interface PlaybackErrorInfo {
  track: PlayTrack
  error: MediaError | Error | null
  /** 播放器已采取的处置：跳过本曲/停止（无可跳过） */
  action: 'skip' | 'stop'
}

export interface PlayerEventMap {
  [PlayerEvent.TrackChanged]: PlayTrack
  [PlayerEvent.StateChanged]: EngineState
  [PlayerEvent.QueueChanged]: QueueChangeType
  [PlayerEvent.ModeChanged]: PlayMode
  [PlayerEvent.PlaybackError]: PlaybackErrorInfo
}
