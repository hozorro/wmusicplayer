// player/runtime/__tests__/event-binder.test.ts
import { describe, expect, it, vi } from 'vitest'
import { createEventBinder } from '../event-binder'
import { EngineEvent } from '../../events'
import type { EngineContext } from '../context'

describe('createEventBinder', () => {
  it('bind 翻译原生事件；unbindAll 完全解除', () => {
    const target = new EventTarget()
    const binder = createEventBinder(target)
    const ctx: EngineContext = { el: {} as HTMLAudioElement, emit: vi.fn() }

    binder.bind([
      { event: 'play', handler: c => c.emit(EngineEvent.StateChanged, 'playing') },
    ], ctx)

    target.dispatchEvent(new Event('play'))
    expect(ctx.emit).toHaveBeenCalledWith(EngineEvent.StateChanged, 'playing')

    binder.unbindAll()
    target.dispatchEvent(new Event('play'))
    expect(ctx.emit).toHaveBeenCalledOnce()
  })
})