export interface IndexConfig {
  name: string
  keyPath: string | string[]
  options?: IDBIndexParameters
}
export interface StoreConfig {
  name: string
  keyPath: string
  indexes?: IndexConfig[]
}
export interface IdbSchema {
  dbName: string
  version: number
  stores: StoreConfig[]
}

/** 
 * 版本策略：bump 即全量重建，不做数据迁移
 * 曲库与 playback 数据均可从后端恢复，迁移逻辑是负资产
 */
export const IDB_VERSION = 1

export const schema: IdbSchema = {
  dbName: 'idb-musiclib',
  version: IDB_VERSION,
  stores: [
    {
      name: 'tracks',
      keyPath: 'id',
      indexes: [
        { name: 'title_lower', keyPath: 'title_lower' },
        { name: 'album_id', keyPath: 'album_id' },
        { name: 'artist_ids', keyPath: 'artist_ids', options: { multiEntry: true } },
        { name: 'genre_titles', keyPath: 'genre_titles', options: { multiEntry: true } },
        { name: 'folder_id', keyPath: 'folder_id' },
        { name: 'hit_count', keyPath: 'hit_count' },
        { name: 'favorited_at', keyPath: 'favorited_at' },
        { name: 'created_at', keyPath: 'created_at' }
      ]
    },
    {
      name: 'artists',
      keyPath: 'id',
      indexes: [
        { name: 'name_lower', keyPath: 'name_lower' },
        { name: 'pinyin_initial', keyPath: 'pinyin_initial' },
        { name: 'hit_count', keyPath: 'hit_count' },
        { name: 'favorited_at', keyPath: 'favorited_at' },
      ]
    },
    {
      name: 'albums',
      keyPath: 'id',
      indexes: [
        { name: 'title_lower', keyPath: 'title_lower' },
        { name: 'artist_ids', keyPath: 'artist_ids', options: { multiEntry: true } },
        { name: 'album_artist_id', keyPath: 'album_artist.id' }
      ]
    },
    {
      name: 'genres',
      keyPath: 'id',
      indexes: [
        { name: 'name_lower', keyPath: 'name_lower' },
      ]
    },
    {
      name: 'folders',
      keyPath: 'id',
      indexes: [
        { name: 'parent_id', keyPath: 'parent_id' },
      ]
    },
    {
      name: 'playlists',
      keyPath: 'id',
      indexes: [
        { name: 'created_at', keyPath: 'created_at' },
      ]
    },
    { name: 'meta', keyPath: 'key' },
  ],
}
