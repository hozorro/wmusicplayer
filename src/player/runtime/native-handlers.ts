import { EngineEvent } from '../events'
import type { EngineContext } from './context'

export interface NativeHandlerDef {
  /** 原生事件名，约束在媒体元素事件表内，编译期防拼写错误 */
  event: keyof HTMLMediaElementEventMap
  /** 纯翻译：原生事件 -> 引擎事件，不做业务决策 */
  handler: (ctx: EngineContext, e: Event) => void
  options?: AddEventListenerOptions
}

/**
 * 新增 / 调整原生事件响应 = 增删一行
 * waiting / playing 成对覆盖 buffering 进出； 'stalled' 不入表（无独立消费者）
 */
export const nativeHandlers = [
  { event: 'play',    handler: (ctx, _e) => ctx.emit(EngineEvent.StateChanged, 'playing')},
  { event: 'pause',   handler: (ctx, _e) => ctx.emit(EngineEvent.StateChanged, 'paused')},
  { event: 'waiting', handler: (ctx, _e) => ctx.emit(EngineEvent.StateChanged, 'buffering')},
  { event: 'playing', handler: (ctx, _e) => ctx.emit(EngineEvent.StateChanged, 'playing')},
  { event: 'ended',   handler: (ctx, _e) => ctx.emit(EngineEvent.Ended)},
  { event: 'timeupdate',      handler: (ctx, _e) => ctx.emit(EngineEvent.TimeUpdate, ctx.el.currentTime)},
  { event: 'durationchange',  handler: (ctx, _e) => ctx.emit(EngineEvent.DurationChange, ctx.el.duration || 0)},
  { event: 'seeked',  handler: (ctx, _e) => ctx.emit(EngineEvent.Seeked, ctx.el.currentTime)},
  { event: 'error',   handler: (ctx, _e) => ctx.emit(EngineEvent.Error, ctx.el.error)}
] satisfies readonly NativeHandlerDef[]
