declare interface ResponseData<T> {
  code: number;
  msg: string;
  data: T;
}

declare type TransferOptions = {
  page_num: number,
  page_size: number
  last_sync?: string,
}
declare type DbMetaInfo = {
  model_name: MetaType;
  total_count: number;
  last_update: string;
}

declare type PopType = 'album' | 'artist' | 'track' | 'playlist' | 'folder' | 'genre';
// #region Album
declare interface Album {
  id: number;
  title: string;
  cover_art_hash?: string;
}
declare interface AlbumInfo extends Album { 
  album_artist: Omit<Artist, 'pinyin_initial'>;
  artists: Omit<Artist, 'pinyin_initial'>[];
  tracks: Track[];
  track_count?: number;  // transform生成属性
  cover?: string;
}
// #endregion

// #region Artist
declare interface Artist {
  id: number;
  name: string;
  pinyin_initial: string;
  cover_art_hash?: string;
}
declare interface ArtistInfo extends Artist { 
  main_albums: Album[];
  track_albums: Album[];
  top_tracks: Track[];
  track_count: number
  cover?: string;
}
// #endregion

// #region Folder
declare interface Folder {
  id: number;
  name: string;
}
declare interface FolderInfo extends Folder {
  parent_id?: number;
  children: Folder[];
  tracks: Track[];
}
// #endregion

// #region Genre
declare interface Genre {
  id: number;
  name: string;
  color: string;
  info?: Record<string, any>;
}
// #endregion

// #region 
declare type Track = {
  id: number;
  title: string;
  artists?: string[];
  cover_art_hash?: string;
  cover?: string;
};
declare interface TrackInfo {
  id: number;
  title: string;
  artists?: {id: number, name: string}[];
  album?: {id: number, title: string};
  duration: number;
  favorited_at?: string;
  hit_count?: number; 
  cover_art_hash?: string;
  cover?: string; // transform生成属性
}
declare interface TrackMoreInfo { 
  id: number;
  title: string;
  duration?: number;
  bitrate?: number;
  bitrate_mode?: string;
  year?: number;
  acoustid_id?: string;
  mb_trackid?: string;
  path: string;
}
// #endregion

// #region Playlist
declare interface Playlist {
  id: number | string;
  title: string;
  cover_art_hash?: string;
  cover?: string; // transform生成属性
}
declare interface PlaylistInfo extends Playlist {
  comment: string;
  created_at: string;
  tracks: Track[];
}
// #endregion

declare interface LyricMeta {
  ar?: string; // artist
  ti?: string; // title
  al?: string; // album
  by?: string; // lyric creator
  hash?: string;
  total?: number;
  offset?: number;
  [key: string]: string | number | undefined;
}

declare interface LyricLine {
  time: number;
  text: string;
}
