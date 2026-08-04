import type { Emitter } from '@/shared/emitter'
import type { EngineEventMap } from '../events'

/**
 * 引擎内部面： native handler的唯一共享上下文
 * 
 * 纪律：
 * - handler是纯翻译器（原生事件 → EngineEvent），只许读取(el) + emit
 * - 绝不挂公开API方法，否则handler可绕过公开面私开控制路径
 * - 本接口不离开runtime模块
 * 
 * 扩展点：若将来某个handler确实去要调度元素操作，在此挂enqueue
 * （SerialQueue['enqueue']）——那将是唯一受认可路径
 */
export interface EngineContext {
  /** 只读访问元素快照（currentTime / duration / error）; handler不得改写元素 */
  readonly el: HTMLAudioElement
  readonly emit: Emitter<EngineEventMap>['emit']
}
