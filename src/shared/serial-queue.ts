/**
 * 串行异步队列：操作严格按入队顺序依次执行
 * 
 * 语义契约：
 * - 调用方拿到操作的真实结果 / 真实reject
 * - 内部链恒 fullfilled —— 单点失败不停摆队列
 * - 同步抛错与异步拒绝同等隔离
 * 
 * 注意：队列本身是“哑”设施，不感知操作是否会挂起
 * 可能挂起的领域操作（如媒体加载）需自带超时
 */
export function createSerialQueue() {
  let chain: Promise<void> = Promise.resolve()
  let pending = 0

  function enqueue<T>(op: () => T | Promise<T>): Promise<T> {
    pending++
    const run = chain.then(op)
    chain = run.then(
      () => { pending-- },
      () => { pending-- }
    )
    return run
  }

  /** 当前积压数（含执行中），调试/诊断用 */
  function size(): number {
    return pending
  }

  /** 返回一个在现有积压全部resolve后的promise， 测试用 */
  function idle(): Promise<void> {
    return chain
  }

  return { enqueue, size, idle }
}

export type SerialQueue = ReturnType<typeof createSerialQueue>
