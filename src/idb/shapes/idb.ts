// 存储形状 = 原子形状 + 派生字段

import type { RawTrack, RawArtist, RawAlbum, RawFolder, RawGenre, RawPlaylist } from "./raw";

export interface IDBTrack extends RawTrack {
  title_lower: string;
  album_id: number;
  artist_ids: number[];
  genre_titles: [number, string][]  // 复合索引载体：[genreId, titlelower]
  hit_count?: number
}

export interface IDBArtist extends RawArtist { name_lower: string; }
export interface IDBAlbum extends RawAlbum { 
  title_lower: string
  album_artist_id: number; 
  artist_ids: number[];
}
export type IDBGenre = RawGenre;
export type IDBFolder = RawFolder
export type IDBPlaylist = RawPlaylist
