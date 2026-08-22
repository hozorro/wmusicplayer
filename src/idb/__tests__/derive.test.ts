// idb/__tests__/derive.test.ts
import { describe, expect, it } from 'vitest'
import { normalize, toIDBTrack, toIDBArtist, toIDBAlbum } from '../derive'

describe('normalize', () => {
  it('trim + lowercase', () => {
    expect(normalize('  Jay Chou ')).toBe('jay chou')
    expect(normalize('周杰伦')).toBe('周杰伦')   // 中文不变
  })
})

describe('toIDBTrack', () => {
  it('派生字段完整生成', () => {
    const t = toIDBTrack({
      id: 1, title: ' Light Years ', duration: 300,
      artists: [{ id: 11, name: 'A' }, { id: 12, name: 'B' }],
      album: { id: 21, title: 'Album' },
      genre_ids: [31, 32], folder_id: 2,
    })
    expect(t.title_lower).toBe('light years')
    expect(t.album_id).toBe(21)
    expect(t.artist_ids).toEqual([11, 12])
    expect(t.genre_titles).toEqual([[31, 'light years'], [32, 'light years']])
  })

  it('缺失关系字段的安全缺省', () => {
    const t = toIDBTrack({ id: 1, title: 'X', duration: 1, folder_id: 0, genre_ids: [] })
    expect(t.artist_ids).toEqual([])
    expect(t.genre_titles).toEqual([])
    expect(t.album_id).toEqual(0)
  })
})

describe('toIDBArtist / toIDBAlbum', () => {
  it('name_lower / title_lower 归一', () => {
    expect(toIDBArtist({ id: 1, name: ' Adele ', pinyin_initial: 'A', track_count: 10 }).name_lower).toBe('adele')
    expect(toIDBAlbum({ id: 1, title: ' 25 ', artists: [{ id: 1, name: 'Adele' }], track_count: 10 }).title_lower).toBe('25')
  })
})