// player/runtime/__tests__/native-handlers.test.ts
import { describe, expect, it, vi } from 'vitest'
import { nativeHandlers } from '../native-handlers'
import { EngineEvent } from '../../events'
import type { EngineContext } from '../context'

const ctxWith = (el: Partial<HTMLAudioElement>): EngineContext =>
  ({ el: el as HTMLAudioElement, emit: vi.fn() })

describe('nativeHandlers 翻译表', () => {
  it('timeupdate → TimeUpdate + 当前时间', () => {
    const ctx = ctxWith({ currentTime: 42 })
    nativeHandlers.find(h => h.event === 'timeupdate')!.handler(ctx, new Event('timeupdate'))
    expect(ctx.emit).toHaveBeenCalledWith(EngineEvent.TimeUpdate, 42)
  })

  it('waiting → StateChanged(buffering)', () => {
    const ctx = ctxWith({})
    nativeHandlers.find(h => h.event === 'waiting')!.handler(ctx, new Event('waiting'))
    expect(ctx.emit).toHaveBeenCalledWith(EngineEvent.StateChanged, 'buffering')
  })

  it('error → Error + el.error 快照', () => {
    const fakeError = { code: 4 } as MediaError
    const ctx = ctxWith({ error: fakeError })
    nativeHandlers.find(h => h.event === 'error')!.handler(ctx, new Event('error'))
    expect(ctx.emit).toHaveBeenCalledWith(EngineEvent.Error, fakeError)
  })
})
