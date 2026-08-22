// idb/__tests__/idb-lib.test.ts
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { openIdb, createIdb, type Idb } from '../idb-lib'
import { schema, type IdbSchema } from '../schema'

// 每次测试独立 DB，避免串扰
const testSchema = (v = 1): IdbSchema => ({ ...schema, dbName: `test-${Date.now()}-${Math.random()}`, version: v })

let idb: Idb
beforeEach(async () => { idb = createIdb(await openIdb(testSchema())) })

describe('建库', () => {
  it('stores 与索引按 schema 建立', () => {
    const names = Array.from(idb.db.objectStoreNames)
    expect(names).toContain('tracks')
    expect(names).toContain('meta')
    expect(idb.db.transaction('tracks').objectStore('tracks').indexNames.contains('genre_titles')).toBe(true)
  })

  it('版本 bump 触发全量重建，旧数据清空', async () => {
    await idb.put('artists', { id: 1, name: 'A', name_lower: 'a' })
    idb.db.close()
    const rebuilt = createIdb(await openIdb(testSchema(2)))
    expect(await rebuilt.getAll('artists')).toEqual([])
  })
})

describe('读写', () => {
  it('put/get 往返', async () => {
    await idb.put('genres', { id: 1, name: 'Jazz', color: '#dddddd' })
    expect(await idb.get('genres', 1)).toMatchObject({ name: 'Jazz' })
  })

  it('bulkPut 分块写入全量到达', async () => {
    const rows = Array.from({ length: 1200 }, (_, i) => ({ id: i, name: `g${i}`, name_lower: `g${i}` }))
    await idb.bulkPut('genres', rows, 500)
    expect(await idb.count('genres')).toBe(1200)
  })
})

describe('genre_titles 复合索引分页', () => {
  beforeEach(async () => {
    await idb.bulkPut('tracks', [
      { id: 1, title: 'B Song', title_lower: 'b song', genre_titles: [[10, 'b song'], [11, 'b song']] },
      { id: 2, title: 'A Song', title_lower: 'a song', genre_titles: [[10, 'a song']] },
      { id: 3, title: 'C Song', title_lower: 'c song', genre_titles: [[11, 'c song']] },
    ])
  })

  const genreRange = (gid: number) => IDBKeyRange.bound([gid], [gid, '\uffff'])

  it('流派内按标题升序', async () => {
    const page = await idb.pageByIndex('tracks', 'genre_titles', genreRange(10), { offset: 0, limit: 10 })
    expect(page.map((t: any) => t.id)).toEqual([2, 1])   // A Song 在前
  })

  it('offset 跳过 + limit 截断', async () => {
    const page = await idb.pageByIndex('tracks', 'genre_titles', genreRange(10), { offset: 1, limit: 1 })
    expect(page).toHaveLength(1)
    expect((page[0] as any).id).toBe(1)
  })

  it('multiEntry：多流派曲目在各流派下均可查', async () => {
    expect(await idb.countByIndex('tracks', 'genre_titles', genreRange(10))).toBe(2)
    expect(await idb.countByIndex('tracks', 'genre_titles', genreRange(11))).toBe(2)
  })

  it('offset 越界返回空页', async () => {
    const page = await idb.pageByIndex('tracks', 'genre_titles', genreRange(10), { offset: 99, limit: 10 })
    expect(page).toEqual([])
  })
})

describe('topByIndex 索引有序取前 N', () => {
  beforeEach(async () => {
    await idb.bulkPut('tracks', [
      { id: 1, title: 't1', title_lower: 't1', created_at: '2024-01-01T00:00:00Z', hit_count: 5 },
      { id: 2, title: 't2', title_lower: 't2', created_at: '2024-03-01T00:00:00Z', hit_count: 9 },
      { id: 3, title: 't3', title_lower: 't3', created_at: '2024-02-01T00:00:00Z' },
    ])
  })

  it('prev 方向取最新 N 条（游标需正常推进，不挂起）', async () => {
    const rows = await idb.topByIndex('tracks', 'created_at', 2, { direction: 'prev' })
    expect(rows.map((t: any) => t.id)).toEqual([2, 3])
  })

  it('索引键缺失的记录不入索引（hit_count 未播放）', async () => {
    const rows = await idb.topByIndex('tracks', 'hit_count', 16, { direction: 'prev' })
    expect(rows.map((t: any) => t.id)).toEqual([2, 1])
  })

  it('空索引返回空数组不挂起', async () => {
    await idb.clear('tracks')
    expect(await idb.topByIndex('tracks', 'hit_count', 16, { direction: 'prev' })).toEqual([])
  })
})