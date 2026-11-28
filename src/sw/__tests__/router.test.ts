import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const ready = vi.hoisted(() => ({ value: true }))
vi.mock('@/sw/idb-ready', () => ({ idbReadyForSw: async () => ready.value }))

let routeApi: typeof import('../router').routeApi
let route: typeof import('../router').route
let MISS: typeof import('@/idb/sw-api/contract').MISS
let json: typeof import('@/idb/sw-api/contract').json

beforeEach(async () => {
  vi.resetModules()
  ready.value = true
  ;({ routeApi, route } = await import('../router'))
  ;({ MISS, json } = await import('@/idb/sw-api/contract'))
})

describe('routeApi', () => {
  it('命中本地 handler 时返回 IDB 响应，不回源', async () => {
    const fetchMock = vi.fn(async () => new Response('backend'))
    vi.stubGlobal('fetch', fetchMock)
    route('/api/local', async () => json({ ok: true }))
    const res = await routeApi(new Request('https://example.com/api/local'))
    expect(await res.json()).toMatchObject({ code: 200, data: { ok: true } })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('MISS 时透传原始 Request 回源后端', async () => {
    const fetchMock = vi.fn(async () => new Response('backend'))
    vi.stubGlobal('fetch', fetchMock)
    route('/api/miss', async () => MISS)
    const req = new Request('https://example.com/api/miss')
    await routeApi(req)
    expect(fetchMock).toHaveBeenCalledWith(req)
  })

  it('IDB 未就绪时直接回源', async () => {
    ready.value = false
    const fetchMock = vi.fn(async () => new Response('backend'))
    vi.stubGlobal('fetch', fetchMock)
    const req = new Request('https://example.com/api/local')
    await routeApi(req)
    expect(fetchMock).toHaveBeenCalledWith(req)
    ready.value = true
  })
})

describe('新端点 × 真实 IDB × routeApi 集成', () => {
  const seed = async (rows: Record<string, unknown>[]) => {
    const { getLibraryIdb } = await import('@/idb')
    const idb = await getLibraryIdb()
    await idb.clear('tracks')
    await idb.bulkPut('tracks', rows)
    await import('../routes')   // 注册全部真实路由（含两条静态新路由）
    return idb
  }

  it('分页与新鲜模式都命中本地 handler，不回源', async () => {
    const fetchMock = vi.fn(async () => new Response('backend'))
    vi.stubGlobal('fetch', fetchMock)
    await seed([
      { id: 1, title: 'A', created_at: '2024-01-01T00:00:00Z', hit_count: 2, last_hit_at: '2024-05-01T00:00:00Z' },
      { id: 2, title: 'B', created_at: '2024-02-01T00:00:00Z', hit_count: 5, last_hit_at: '2024-05-02T00:00:00Z' },
    ])

    const pageRes = await routeApi(new Request(
      'https://example.com/api/music/track/tracks?sort=history&page=1&page_size=20'))
    expect(await pageRes.json()).toMatchObject({
      code: 200,
      data: { total: 2, page: 1, page_size: 20, sort: 'history', tracks: [{ id: 2 }, { id: 1 }] },
    })

    const freshRes = await routeApi(new Request(
      'https://example.com/api/music/track/rndfreshtracks?num=2&pool=100'))
    expect((await freshRes.json()).data).toHaveLength(2)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('空库时 rndfreshtracks 返回 MISS 并透传原始 Request 回源', async () => {
    const fetchMock = vi.fn(async () => new Response('backend'))
    vi.stubGlobal('fetch', fetchMock)
    await seed([])
    const req = new Request('https://example.com/api/music/track/rndfreshtracks?num=50&pool=500')
    await routeApi(req)
    expect(fetchMock).toHaveBeenCalledWith(req)
  })

  it('rndwgttracks 经 routeApi 返回展平的 Track[]', async () => {
    const fetchMock = vi.fn(async () => new Response('backend'))
    vi.stubGlobal('fetch', fetchMock)
    const { getLibraryIdb } = await import('@/idb')
    const idb = await getLibraryIdb()
    await idb.clear('tracks')
    await idb.clear('artists')
    await idb.bulkPut('artists', [{ id: 1, name: 'A', name_lower: 'a', track_count: 1 }])
    await idb.bulkPut('tracks', [{
      id: 9, title: 'X', artist_ids: [1],
      hit_count: 0, hits: [], created_at: '2024-01-01T00:00:00Z',
    }])
    await import('../routes')

    const res = await routeApi(new Request(
      'https://example.com/api/music/track/rndwgttracks?num=5&weight=5'))
    const data = (await res.json()).data
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe(9)
    expect(data[0].artist).toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
