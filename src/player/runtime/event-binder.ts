import type { EngineContext } from "./context";
import type { NativeHandlerDef } from "./native-handlers";

/**
 * 监听声明周期收口
 * 绑定成批、销毁成批， HMR 与 Dispose 不会叠加监听器
 */
export function createEventBinder(el: EventTarget) {
  const records: Array<{
    event: string
    listener: EventListener
    options?: AddEventListenerOptions
  }> = []

  function bind(defs: readonly NativeHandlerDef[], ctx: EngineContext): void {
    for (const def of defs) {
      const listener =(e: Event) => def.handler(ctx, e)
      el.addEventListener(def.event, listener, def.options)
      records.push({ event: def.event, listener, options: def.options })
    }
  }

  function unbindAll(): void {
    for (const { event, listener, options } of records) {
      el.removeEventListener(event, listener, options)
    }
    records.length = 0
  }

  return { bind, unbindAll }
}