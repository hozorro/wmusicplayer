// 派生字段生成的唯一实现（纯函数，单测覆盖）

import type { IDBArtist, IDBTrack, IDBAlbum, IDBGenre, IDBFolder, IDBPlaylist } from "./shapes/idb";
import type { RawAlbum, RawArtist, RawGenre, RawTrack, RawFolder, RawPlaylist } from "./shapes/raw";

/** 归一化唯一实现：派生侧与查询侧共用，漂移即索引失败 */
export const normalize = (s: string) => s.trim().toLocaleLowerCase()

export function toIDBTrack(raw: RawTrack): IDBTrack {
  const title_lower = normalize(raw.title)
  return {
    ...raw,
    title_lower,
    album_id: raw.album?.id ?? 0,
    artist_ids: raw.artists?.map(a => a.id) ?? [],
    genre_titles: (raw.genre_ids ?? []).map(gid => [gid, title_lower] as [number, string]),
    hit_count: raw.hits?.length ?? 0
  }
}

export function toIDBArtist(raw: RawArtist): IDBArtist {
  return { ...raw, name_lower: normalize(raw.name) }
}

export function toIDBAlbum(raw: RawAlbum): IDBAlbum {
  return { 
    ...raw, 
    title_lower: normalize(raw.title), 
    album_artist_id: raw.album_artist?.id ?? 0, 
    artist_ids: raw.artists?.map(a => a.id) ?? [] 
  }
}

// 无派生字段的实体直通
export const toIDBGenre = (g: RawGenre): IDBGenre => g
export const toIDBFolder = (f: RawFolder): IDBFolder => f
export const toIDBPlaylist = (p: RawPlaylist): IDBPlaylist => p
