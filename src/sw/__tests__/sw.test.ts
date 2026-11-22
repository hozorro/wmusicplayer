import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const h = vi.hoisted(() => ({
  precacheAndRoute: vi.fn(),
  createHandlerBoundToURL: vi.fn(),
  registerRoute: vi.fn(),
  addEventListener: vi.fn(),
  navigationHandler: null as unknown,
}))

vi.mock('workbox-precaching', () => ({
  precacheAndRoute: h.precacheAndRoute,
  createHandlerBoundToURL: h.createHandlerBoundToURL,
}))
vi.mock('workbox-routing', () => ({
  NavigationRoute: class {
    constructor(handler: unknown) {
      h.navigationHandler = handler
    }
  },
  registerRoute: h.registerRoute,
}))
vi.mock('workbox-strategies', () => ({
  CacheFirst: class {
    constructor(_options: unknown) {}
  },
}))
vi.mock('workbox-expiration', () => ({
  ExpirationPlugin: class {
    constructor(_options: unknown) {}
  },
}))
vi.mock('@/sw/stream', () => ({ mediaStreamCacheHandler: vi.fn() }))
vi.mock('@/sw/routes', () => ({}))
vi.mock('@/sw/router', () => ({ routeApi: vi.fn() }))

type SwSelf = {
  __WB_MANIFEST: unknown[]
  __SW_VERSION__: string
  navigator: { onLine: boolean }
  addEventListener: typeof h.addEventListener
  clients: { claim: () => void }
  skipWaiting: () => void
}

describe('sw.ts top-level evaluation', () => {
  beforeEach(() => {
    vi.resetModules()
    h.precacheAndRoute.mockReset()
    h.createHandlerBoundToURL.mockReset().mockReturnValue(() => Promise.resolve(new Response('shell')))
    h.registerRoute.mockReset()
    h.addEventListener.mockReset()
    h.navigationHandler = null

    vi.stubGlobal('self', {
      __WB_MANIFEST: [],
      __SW_VERSION__: '',
      navigator: { onLine: true },
      addEventListener: h.addEventListener,
      clients: { claim: vi.fn() },
      skipWaiting: vi.fn(),
    } satisfies SwSelf)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not create an app shell when the dev manifest is empty', async () => {
    await expect(import('../sw')).resolves.toBeDefined()

    expect(h.precacheAndRoute).toHaveBeenCalledWith([])
    // Workbox 的 non-precached-url 会在顶层求值阶段抛出，导致 SW 注册失败
    expect(h.createHandlerBoundToURL).not.toHaveBeenCalled()
    expect(h.registerRoute).toHaveBeenCalled()
  })

  it('falls back to an offline 503 instead of throwing when offline with no app shell', async () => {
    await import('../sw')
    ;(self as unknown as SwSelf).navigator.onLine = false

    const handler = h.navigationHandler as (options: { request: Request }) => Promise<Response>
    const response = await handler({ request: new Request('https://example.com/playlist/3') })

    expect(response.status).toBe(503)
    expect(h.createHandlerBoundToURL).not.toHaveBeenCalled()
  })

  it('binds the precached app shell when the production manifest is present', async () => {
    const manifest = [{ url: 'index.html', revision: 'abc123' }]
    ;(self as unknown as SwSelf).__WB_MANIFEST = manifest

    await expect(import('../sw')).resolves.toBeDefined()

    expect(h.precacheAndRoute).toHaveBeenCalledWith(manifest)
    expect(h.createHandlerBoundToURL).toHaveBeenCalledWith('index.html')
  })

  it('uses the precached app shell for offline navigation in production', async () => {
    ;(self as unknown as SwSelf).__WB_MANIFEST = [{ url: 'index.html', revision: 'abc123' }]
    await import('../sw')
    ;(self as unknown as SwSelf).navigator.onLine = false

    const handler = h.navigationHandler as (options: { request: Request }) => Promise<Response>
    const response = await handler({ request: new Request('https://example.com/playlist/3') })

    expect(await response.text()).toBe('shell')
  })
})
