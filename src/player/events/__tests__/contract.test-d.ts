// player/events/__tests__/contract.test-d.ts —— vue-tsc --noEmit 即可运行
import { createEmitter } from '@/player/shared/emitter'
import { EngineEvent, type EngineEventMap } from '../engine'

const bus = createEmitter<EngineEventMap>()

bus.on(EngineEvent.Ended, () => {})                 // ✓ void 载荷可无参
bus.on(EngineEvent.TimeUpdate, t => t.toFixed(1))   // ✓ t 推断为 number
bus.emit(EngineEvent.Ended)                         // ✓
bus.emit(EngineEvent.TimeUpdate, 12.5)              // ✓

// @ts-expect-error 缺载荷
bus.emit(EngineEvent.TimeUpdate)
// @ts-expect-error 载荷类型错误
bus.on(EngineEvent.Error, (e: string) => {})