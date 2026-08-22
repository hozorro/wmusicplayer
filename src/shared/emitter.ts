/**
 * 订阅者处理函数；void载荷的事件可写作无参数函数
 */
export type EventHandler<T> = (payload: T) => void

/**
 * 类型化事件发生器
 * 
 * 语义约定：
 * - 同步发射：handler在emit调用栈内按注册顺序执行
 * - 异常隔离：单个handler抛错不影响其余订阅者
 * - 快照语义：emit开始时锁定本轮接收者，期间增删的订阅下一轮生效
 * - 通知语义：emit无返回值，不期待应答——事件不是RPC
 */
export function createEmitter<EventMap extends {[K in keyof EventMap]: unknown}>() {
  const listeners = new Map<keyof EventMap, Set<EventHandler<any>>>();

  function on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    let set = listeners.get(event)
    if (!set) listeners.set(event,(set = new Set()))
    set.add(handler)
    return () => off(event, handler)
  }

  function off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    listeners.get(event)?.delete(handler)
  }

  function emit<K extends keyof EventMap>(event: K, ...args: EventMap[K] extends void ? [] : [payload: EventMap[K]]): void {
    const set = listeners.get(event)
    if (!set?.size) return 
    const payload = args[0] as EventMap[K]
    for (const handler of [...set]) {
      try {
        handler(payload)
      } catch (err) {
        console.error(`[emitter]  "${String(event)}" handler error:`, err)
      }
    }
  }

  function clear(event?: keyof EventMap): void {
    if (event !== undefined) listeners.delete(event)
    else listeners.clear()
  }

  return { on, off, emit, clear }
}

export type Emitter<EventMap extends {[K in keyof EventMap]: unknown}> = ReturnType<typeof createEmitter<EventMap>>
