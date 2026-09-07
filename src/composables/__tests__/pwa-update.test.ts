// @vitest-environment happy-dom
// composables/__tests__/pwa-update.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, type App } from 'vue'
import { createEmitter } from '@/shared/emitter'
import { PlayerEvent } from '@/player/events'
import type { PlayerEventMap } from '@/player/events'
import type { EngineState } from '@/player/types'

// —— mock player/facade：返回内存 bus + 可控 engineState ——
const facadeMock = vi.hoisted(() => {
  const state = { engineState: 'idle' as EngineState }
  return {
    state,
    bus: null as unknown as ReturnType<typeof createEmitter<PlayerEventMap>>,
  }
})
vi.mock('@/player/facade', () => ({
  getPlayerFacade: () => ({
    bus: facadeMock.bus,
    queue: { engineState: facadeMock.state.engineState },
  }),
}))

// —— mock serviceWorker ——
const swMock = vi.hoisted(() => ({
  ready: null as unknown as Promise<ServiceWorkerRegistration>,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  controller: {} as ServiceWorker,
}))

import { usePWAUpdate } from '../pwa-update'

function makeRegistration(overrides: Partial<ServiceWorkerRegistration> = {}) {
  return {
    waiting: null,
    installing: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    update: vi.fn(),
    ...overrides,
  } as unknown as ServiceWorkerRegistration
}

interface SetupResult {
  app: App
  unmount: () => void
  api: ReturnType<typeof usePWAUpdate>
}

function mountWith(registration: ServiceWorkerRegistration): SetupResult {
  swMock.ready = Promise.resolve(registration)
  vi.stubGlobal('navigator', { serviceWorker: swMock })

  let api!: ReturnType<typeof usePWAUpdate>
  const Comp = defineComponent({
    setup() {
      api = usePWAUpdate()
      return () => h('div')
    },
  })
  const el = document.createElement('div')
  const app = createApp(Comp)
  app.mount(el)
  return { app, unmount: () => app.unmount(), api }
}

async function flushMounted() {
  // onMounted 是 async（await navigator.serviceWorker.ready），需要两轮微任务
  await nextTick()
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  vi.clearAllMocks()
  facadeMock.bus = createEmitter<PlayerEventMap>()
  facadeMock.state.engineState = 'idle'
})

describe('usePWAUpdate 播放感知', () => {
  it('未在播放（idle）：检测到 waiting SW 立即提示', async () => {
    facadeMock.state.engineState = 'idle'
    const reg = makeRegistration({ waiting: {} as ServiceWorker })
    const { api, unmount } = mountWith(reg)
    await flushMounted()
    expect(api.updateAvailable.value).toBe(true)
    unmount()
  })

  it('未在播放（paused）：立即提示', async () => {
    facadeMock.state.engineState = 'paused'
    const reg = makeRegistration({ waiting: {} as ServiceWorker })
    const { api, unmount } = mountWith(reg)
    await flushMounted()
    expect(api.updateAvailable.value).toBe(true)
    unmount()
  })

  it('正在播放（playing）：不立即提示；首次 paused 时提示并自取消订阅', async () => {
    facadeMock.state.engineState = 'playing'
    const reg = makeRegistration({ waiting: {} as ServiceWorker })
    const { api, unmount } = mountWith(reg)
    await flushMounted()
    expect(api.updateAvailable.value).toBe(false)

    facadeMock.bus.emit(PlayerEvent.StateChanged, 'paused')
    expect(api.updateAvailable.value).toBe(true)

    // 订阅已自取消：再次发射不应引发异常或重复置位（值仍 true，无副作用）
    facadeMock.bus.emit(PlayerEvent.StateChanged, 'playing')
    facadeMock.bus.emit(PlayerEvent.StateChanged, 'paused')
    expect(api.updateAvailable.value).toBe(true)
    unmount()
  })

  it('playing → buffering 不触发（仍属活跃态）', async () => {
    facadeMock.state.engineState = 'playing'
    const reg = makeRegistration({ waiting: {} as ServiceWorker })
    const { api, unmount } = mountWith(reg)
    await flushMounted()
    expect(api.updateAvailable.value).toBe(false)

    facadeMock.bus.emit(PlayerEvent.StateChanged, 'buffering')
    expect(api.updateAvailable.value).toBe(false)
    facadeMock.bus.emit(PlayerEvent.StateChanged, 'loading')
    expect(api.updateAvailable.value).toBe(false)

    facadeMock.bus.emit(PlayerEvent.StateChanged, 'idle')
    expect(api.updateAvailable.value).toBe(true)
    unmount()
  })

  it('buffering 冷启动：同样延迟到退出活跃态', async () => {
    facadeMock.state.engineState = 'buffering'
    const reg = makeRegistration({ waiting: {} as ServiceWorker })
    const { api, unmount } = mountWith(reg)
    await flushMounted()
    expect(api.updateAvailable.value).toBe(false)
    facadeMock.bus.emit(PlayerEvent.StateChanged, 'error')
    expect(api.updateAvailable.value).toBe(true)
    unmount()
  })

  it('unmount 时清理订阅：卸载后状态迁移不再影响', async () => {
    facadeMock.state.engineState = 'playing'
    const reg = makeRegistration({ waiting: {} as ServiceWorker })
    const { api, unmount } = mountWith(reg)
    await flushMounted()
    expect(api.updateAvailable.value).toBe(false)

    unmount()
    // 卸载后 emit 不应抛错，且 api.updateAvailable 保持 false
    expect(() => facadeMock.bus.emit(PlayerEvent.StateChanged, 'paused')).not.toThrow()
    expect(api.updateAvailable.value).toBe(false)
  })

  it('revealUpdate 幂等：多次触发仅订阅一次', async () => {
    facadeMock.state.engineState = 'playing'
    const reg = makeRegistration({ waiting: {} as ServiceWorker })
    const { api, unmount } = mountWith(reg)
    await flushMounted()

    // 通过 SW_UPDATED 消息再次触发 revealUpdate
    const messageHandler = swMock.addEventListener.mock.calls
      .find(([ev]) => ev === 'message')?.[1] as ((e: MessageEvent) => void) | undefined
    messageHandler?.({ data: { type: 'SW_UPDATED' } } as MessageEvent)
    messageHandler?.({ data: { type: 'SW_UPDATED' } } as MessageEvent)

    expect(api.updateAvailable.value).toBe(false)
    facadeMock.bus.emit(PlayerEvent.StateChanged, 'paused')
    expect(api.updateAvailable.value).toBe(true)
    unmount()
  })

  it('deferUpdate：仅隐藏本次提示，updateAvailable 保持 true', async () => {
    facadeMock.state.engineState = 'idle'
    const reg = makeRegistration({ waiting: {} as ServiceWorker })
    const { api, unmount } = mountWith(reg)
    await flushMounted()
    expect(api.updateAvailable.value).toBe(true)
    expect(api.dismissed.value).toBe(false)
    api.deferUpdate()
    expect(api.dismissed.value).toBe(true)
    expect(api.updateAvailable.value).toBe(true)
    unmount()
  })
})
