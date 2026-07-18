/**
 * Player Engine
 * Simple Promise Queue
 */

export interface IQueue {
  // 将任务加入队列
  enqueue<T>(task: () => Promise<T>): Promise<T>

  // 当前是否有任务执行
  isBusy(): boolean

  // 等待队列全部完成
  waitIdle(): Promise<void>

  // 清空等待中的任务,注意：不会中断正在执行的任务。
  clear(): void

  // 销毁
  destroy(): void
}

interface QueueItem<T = unknown> {
  task: () => Promise<T>
  resolve(value: T): void
  reject(reason?: unknown): void
}

class QueueCancelledError extends Error {
  constructor() {
    super('Queue cancelled')
    this.name = 'QueueCancelledError'
  }
}

export function createQueue(): IQueue {
  const queue: QueueItem[] = []

  let running = false

  let destroyed = false

  const idleResolves = new Set<() => void>()

  function clearQueue(): void {
    const error = new QueueCancelledError()
    while (queue.length > 0) {
      const item = queue.shift()!
      if (item) item.reject(error)
    }
  }

  function notifyIdle(): void {
    for (const resolve of idleResolves) {
      resolve()
    }

    idleResolves.clear()
  }

  async function runNext(): Promise<void> {
    if (running) return

    const item = queue.shift()

    if (!item) {
      notifyIdle()
      return
    }

    running = true

    try {
      const result = await item.task()
      item.resolve(result)
    } catch (error) {
      item.reject(error)
    } finally {
      running = false
      void runNext()
    }
  }

  return {
    enqueue(task) {
      return new Promise((resolve, reject) => {
        queue.push({
          task,
          resolve,
          reject,
        })

        void runNext()
      })
    },

    isBusy() {
      return running
    },

    clear() {
      clearQueue()
    },

    destroy() {
      destroyed = true
      clearQueue()
      notifyIdle()
    },

    waitIdle() {
      if (!running && queue.length === 0) {
        return Promise.resolve()
      }

      return new Promise<void>((resolve) => {
        idleResolves.add(resolve)
      })
    },
  }
}