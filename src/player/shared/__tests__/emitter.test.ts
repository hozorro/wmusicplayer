// shared/__tests__/emitter.test.ts —— 行为契约
import { describe, expect, it, vi } from 'vitest'
import { createEmitter } from '../emitter'

describe('createEmitter', () => {
  it('异常隔离：前一个 handler 抛错不影响后续', () => {
    // 该用例故意抛错，静默掉生产代码的隔离日志，避免噪声进入 stderr
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const bus = createEmitter<{ e: void }>()
      const spy = vi.fn()
      bus.on('e', () => { throw new Error('boom') })
      bus.on('e', spy)
      bus.emit('e')
      expect(spy).toHaveBeenCalledOnce()
      expect(errorSpy).toHaveBeenCalledOnce()
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('handler error'),
        expect.any(Error),
      )
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('快照语义：发射期间退订，本轮仍执行', () => {
    const bus = createEmitter<{ e: void }>()
    const calls: string[] = []
    let offB: () => void
    bus.on('e', () => { calls.push('a'); offB() })
    offB = bus.on('e', () => calls.push('b'))
    bus.emit('e')
    expect(calls).toEqual(['a', 'b'])   // b 本轮仍收到，下一轮不再收到
  })

  it('on 返回退订函数', () => {
    const bus = createEmitter<{ e: number }>()
    const spy = vi.fn()
    const off = bus.on('e', spy)
    off()
    bus.emit('e', 1)
    expect(spy).not.toHaveBeenCalled()
  })
})