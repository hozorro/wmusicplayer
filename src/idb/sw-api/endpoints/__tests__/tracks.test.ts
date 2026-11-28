import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createIdb, openIdb, type Idb } from '@/idb/idb-lib'
import { schema, IDB_VERSION } from '@/idb/schema'
import type { IDBTrack } from '@/idb/shapes/idb'
import { MISS } from '../../contract'
import { HOME_TRACK_COUNT } from '@/config/player-config'
import {
  idbGetSortedTracks, idbGetRndFreshTracks,
  idbGetLatestTracks, idbGetHotTracks,
  idbGetRndArtistSctdTracks, idbGetRndUnhitTracks,
  idbGetWgtRndArtistTracks, idbGetWgtRndTracks,
} from '../tracks'

const { idbRef } = vi.hoisted(() => ({ idbRef: { current: null as Idb | null } }))
vi.mock('@/idb', () => ({ getLibraryIdb: async () => idbRef.current }))

// 直接用生产 schema，测试库不再自行补索引/改版本，避免与线上结构漂移
const testSchema = () => ({ ...schema, dbName: `test-handler-${Math.random()}` })

const row = (id: number, created_at: string, hit_count: number, last_hit_at?: string): IDBTrack => ({
  id,
  title: `t${id}`,
  title_lower: `t${id}`,
  album_id: 0,
  artist_ids: [],
  genre_titles: [],
  duration: 100,
  genre_ids: [],
  folder_id: 0,
  created_at,
  hit_count,
  hits: last_hit_at ? [last_hit_at] : [],
  last_hit_at
})

const ctx = (qs: string) => ({ params: {}, query: new URLSearchParams(qs) })
const dataOf = async (res: Response | typeof MISS) => {
  if (res === MISS) throw new Error('unexpected MISS')
  return (await (res as Response).json()).data
}

beforeEach(async () => {
  idbRef.current = createIdb(await openIdb(testSchema()))
  await idbRef.current!.bulkPut('tracks', [
    row(1, '2024-01-01T00:00:00Z', 5, '2024-05-01T00:00:00Z'),
    row(2, '2024-04-01T00:00:00Z', 9, '2024-05-03T00:00:00Z'),
    row(3, '2024-03-01T00:00:00Z', 1, '2024-05-02T00:00:00Z'),
    row(4, '2024-02-01T00:00:00Z', 0)
  ])
})

describe('生产 schema', () => {
  it('IDB_VERSION=2 且 tracks 实际建立 last_hit_at 索引', () => {
    expect(IDB_VERSION).toBe(2)
    expect(schema.version).toBe(IDB_VERSION)
    expect(schema.stores.find(s => s.name === 'tracks')?.indexes?.some(i => i.name === 'last_hit_at')).toBe(true)
    expect(idbRef.current!.db.version).toBe(2)
    expect(idbRef.current!.db.transaction('tracks').objectStore('tracks').indexNames.contains('last_hit_at')).toBe(true)
  })
})

describe('idbGetSortedTracks', () => {
  it('latest 按 created_at 降序分页，total 与索引一致', async () => {
    const data = await dataOf(await idbGetSortedTracks(ctx('sort=latest&page=1&page_size=2')))
    expect(data.tracks.map((t: IDBTrack) => t.id)).toEqual([2, 3])
    expect(data.total).toBe(4)
    expect(data.page).toBe(1)
    expect(data.page_size).toBe(2)
    expect(data.sort).toBe('latest')
  })

  it('hot 按 hit_count 降序，第二页正确', async () => {
    const data = await dataOf(await idbGetSortedTracks(ctx('sort=hot&page=2&page_size=2')))
    expect(data.tracks.map((t: IDBTrack) => t.id)).toEqual([3, 4])
    expect(data.total).toBe(4)
  })

  it('history 按 last_hit_at 降序，只含有播放记录的曲目且派生字段不外泄', async () => {
    const data = await dataOf(await idbGetSortedTracks(ctx('sort=history&page=1&page_size=2')))
    expect(data.tracks.map((t: IDBTrack) => t.id)).toEqual([2, 3])
    expect(data.total).toBe(3)
    expect(data.tracks.every((t: Record<string, unknown>) => !('last_hit_at' in t))).toBe(true)
  })

  it('page_size 上限钳制到 100', async () => {
    const data = await dataOf(await idbGetSortedTracks(ctx('sort=latest&page_size=999')))
    expect(data.page_size).toBe(100)
    expect(data.tracks).toHaveLength(4)
  })

  it('page/page_size 非数字回退默认值、小数截断', async () => {
    const data = await dataOf(await idbGetSortedTracks(ctx('sort=latest&page=abc&page_size=2.9')))
    expect(data.page).toBe(1)
    expect(data.page_size).toBe(2)
  })

  it('空曲库返回空页而不是 MISS', async () => {
    await idbRef.current!.clear('tracks')
    const res = await idbGetSortedTracks(ctx('sort=latest&page=1&page_size=20'))
    expect(res).not.toBe(MISS)
    expect(await dataOf(res)).toMatchObject({
      tracks: [], total: 0, page: 1, page_size: 20, sort: 'latest'
    })
  })

  it('超大 page 返回空页而不是挂起', async () => {
    const data = await dataOf(await idbGetSortedTracks(ctx('sort=latest&page=9007199254740991&page_size=100')))
    expect(data.tracks).toEqual([])
    expect(data.total).toBe(4)
  })

  it('非法 sort 返回 MISS', async () => {
    expect(await idbGetSortedTracks(ctx('sort=unknown'))).toBe(MISS)
  })
})

describe('idbGetRndFreshTracks', () => {
  it('只在最近添加的 pool 首中随机取 num 首，且不重复', async () => {
    const rows = Array.from({ length: 200 }, (_, i) =>
      row(i + 1, new Date(Date.UTC(2024, 0, 1) + (i + 1) * 86400000).toISOString(), 0)
    )
    await idbRef.current!.clear('tracks')
    await idbRef.current!.bulkPut('tracks', rows)

    const data = await dataOf(await idbGetRndFreshTracks(ctx('num=5&pool=100')))
    expect(data).toHaveLength(5)
    expect(new Set(data.map((t: IDBTrack) => t.id)).size).toBe(5)
    expect(data.every((t: IDBTrack) => t.id > 100)).toBe(true)
  })

  it('pool 不足时按实际数量返回', async () => {
    const data = await dataOf(await idbGetRndFreshTracks(ctx('num=50&pool=100')))
    expect(data).toHaveLength(4)
  })

  it('空曲库返回 MISS', async () => {
    await idbRef.current!.clear('tracks')
    expect(await idbGetRndFreshTracks(ctx('num=50&pool=100'))).toBe(MISS)
  })
})

describe('idbGetRndFreshTracks 参数夹取与取整', () => {
  beforeEach(async () => {
    await idbRef.current!.clear('tracks')
    // 300 首，created_at 随 id 递增：候选池 = 最新 pool 首 = id > 300 - pool
    await idbRef.current!.bulkPut('tracks', Array.from({ length: 300 }, (_, i) =>
      row(i + 1, new Date(Date.UTC(2024, 0, 1) + (i + 1) * 86400000).toISOString(), 0)
    ))
  })

  it('num 上限 200、下限 1，非法值回退 50，小数截断', async () => {
    expect(await dataOf(await idbGetRndFreshTracks(ctx('num=999&pool=1000')))).toHaveLength(200)
    expect(await dataOf(await idbGetRndFreshTracks(ctx('num=0&pool=1000')))).toHaveLength(1)
    expect(await dataOf(await idbGetRndFreshTracks(ctx('num=abc&pool=1000')))).toHaveLength(50)
    expect(await dataOf(await idbGetRndFreshTracks(ctx('num=3.7&pool=1000')))).toHaveLength(3)
  })

  it('pool 按 100 取整并夹到 100~1000', async () => {
    const pick = async (pool: string) =>
      (await dataOf(await idbGetRndFreshTracks(ctx(`num=1&pool=${pool}`))))[0].id as number
    expect(await pick('149')).toBeGreaterThan(200)  // 149 → 100
    expect(await pick('150')).toBeGreaterThan(100)  // 150 → 200
    expect(await pick('50')).toBeGreaterThan(200)   // 50 → 钳到 100
    expect(await pick('9999')).toBeGreaterThan(0)   // 9999 → 钳到 1000
  })

  it('pool 非法值回退默认 500', async () => {
    const data = await dataOf(await idbGetRndFreshTracks(ctx('num=10&pool=abc')))
    expect(data).toHaveLength(10)
    expect(new Set(data.map((t: IDBTrack) => t.id)).size).toBe(10)
  })
})

describe('首页条数与 4 个高级随机端点的本地形状', () => {
  beforeEach(async () => {
    await idbRef.current!.clear('tracks')
    await idbRef.current!.bulkPut('artists', [
      { id: 1, name: 'A', name_lower: 'a', track_count: 2 },
      { id: 2, name: 'B', name_lower: 'b', track_count: 2 },
    ])
    await idbRef.current!.bulkPut('tracks', Array.from({ length: 20 }, (_, i) => ({
      ...row(i + 1, new Date(Date.UTC(2024, 0, 1) + (i + 1) * 86400000).toISOString(), 0),
      artist_ids: [i % 2 === 0 ? 1 : 2],
    })))
  })

  it('latest/hot 默认 16 条，与后端 HOME_TRACK_COUNT 一致', async () => {
    expect(await dataOf(await idbGetLatestTracks(ctx('')))).toHaveLength(HOME_TRACK_COUNT)
    expect(await dataOf(await idbGetHotTracks(ctx('')))).toHaveLength(HOME_TRACK_COUNT)
  })

  it('latest/hot 尊重 num 并夹取到 1~100', async () => {
    expect(await dataOf(await idbGetLatestTracks(ctx('num=5')))).toHaveLength(5)
    expect(await dataOf(await idbGetHotTracks(ctx('num=999')))).toHaveLength(20)
  })

  it('4 个高级随机端点都返回展平的 Track[]，无 artist/tracks 包装', async () => {
    const cases = [
      idbGetRndArtistSctdTracks(ctx('num=3&numpa=1')),
      idbGetRndUnhitTracks(ctx('num=3')),
      idbGetWgtRndArtistTracks(ctx('num=3&weight=5')),
      idbGetWgtRndTracks(ctx('num=3&weight=5')),
    ]
    for (const res of cases) {
      const data = await dataOf(await res)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
      expect(data.every((t: Record<string, unknown>) =>
        typeof t.id === 'number' && !('artist' in t) && !('tracks' in t))).toBe(true)
    }
  })

  it('rndwgttracks 结果按 id 去重', async () => {
    const data = await dataOf(await idbGetWgtRndArtistTracks(ctx('num=10&weight=5')))
    expect(new Set(data.map((t: IDBTrack) => t.id)).size).toBe(data.length)
  })
})
