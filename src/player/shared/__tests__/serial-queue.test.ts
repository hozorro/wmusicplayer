// shared/__tests__/serial-queue.test.ts
import { describe, expect, it, vi } from 'vitest'
import { createSerialQueue } from '../serial-queue'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

describe('createSerialQueue', () => {
  it('严格按入队顺序执行，与各自耗时无关', async () => {
    const q = createSerialQueue()
    const order: number[] = []
    q.enqueue(async () => { await delay(30); order.push(1) })
    q.enqueue(async () => { await delay(5); order.push(2) })
    q.enqueue(() => { order.push(3) })
    await q.idle()
    expect(order).toEqual([1, 2, 3])
  })

  it('同步抛错：调用方收到拒绝，队列继续', async () => {
    const q = createSerialQueue()
    const spy = vi.fn()
    const p = q.enqueue(() => { throw new Error('boom') })
    q.enqueue(spy)
    await expect(p).rejects.toThrow('boom')
    await q.idle()
    expect(spy).toHaveBeenCalledOnce()
  })

  it('异步拒绝同样隔离', async () => {
    const q = createSerialQueue()
    const spy = vi.fn()
    const p = q.enqueue(async () => { throw new Error('async boom') })
    q.enqueue(spy)
    await expect(p).rejects.toThrow('async boom')
    await q.idle()
    expect(spy).toHaveBeenCalledOnce()
  })
})