import 'fake-indexeddb/auto'
import { beforeAll, expect, it, vi } from 'vitest'

const { registered } = vi.hoisted(() => ({ registered: [] as { path: string; handler: unknown }[] }))
vi.mock('../router', () => ({
  route: (path: string, handler: unknown) => { registered.push({ path, handler }) }
}))

beforeAll(async () => { await import('../routes') })

it('两条新静态路由都注册了本地 handler', () => {
  for (const p of ['/api/music/track/tracks', '/api/music/track/rndfreshtracks']) {
    const hit = registered.find(r => r.path === p)
    expect(hit).toBeDefined()
    expect(typeof hit?.handler).toBe('function')
  }
})

it('静态路由必须排在 /api/music/track/:id 之前', () => {
  const idx = (p: string) => registered.findIndex(r => r.path === p)
  const wildcard = idx('/api/music/track/:id')
  expect(wildcard).toBeGreaterThanOrEqual(0)
  expect(idx('/api/music/track/tracks')).toBeLessThan(wildcard)
  expect(idx('/api/music/track/rndfreshtracks')).toBeLessThan(wildcard)
})

it('4 个高级随机端点与首页两条列表都有本地 handler，且排在动态段之前', () => {
  const idx = (p: string) => registered.findIndex(r => r.path === p)
  const wildcard = idx('/api/music/track/:id')
  for (const p of [
    '/api/music/track/rndartisttracks',
    '/api/music/track/rndunhittracks',
    '/api/music/track/rndwgttracks',
    '/api/music/track/rndhitswgttracks',
    '/api/music/track/latesttracks',
    '/api/music/track/mostplayedtracks',
  ]) {
    expect(idx(p)).toBeGreaterThanOrEqual(0)
    expect(typeof registered[idx(p)].handler).toBe('function')
    expect(idx(p)).toBeLessThan(wildcard)
  }
})
