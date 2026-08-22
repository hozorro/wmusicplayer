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
declare interface AlbumBase {
  id: number;
  title: string;
}
declare interface Album extends AlbumBase {
  cover_art_hash?: string;
  cover?: string;
  track_count?: number;
}
declare interface AlbumInfo extends Album { 
  album_artist: Omit<Artist, 'pinyin_initial'>;
  artists: Omit<Artist, 'pinyin_initial'>[];
  tracks: Track[];
  track_count?: number;  // transform generated property
  cover?: string;
}
// #endregion

// #region Artist
declare interface ArtistBase {
  id: number;
  name: string;
}
declare interface Artist extends ArtistBase {
  pinyin_initial: string;
  face_art_hash?: string;
  portrait_art_hash?: string;
  cover?: string;
}
declare interface ArtistInfo extends Artist { 
  main_albums: Album[];
  track_albums: Album[];
  top_tracks: Track[];
  track_count: number
  face?: string;
  portrait?: string;
}
// #endregion

// #region Folder
declare interface Folder {
  id: number;
  name: string;
}
declare interface FolderBrief extends Folder {
  subfolder_count?: number
  track_count?: number
}
declare interface FolderInfo extends Folder {
  ancestors: Folder[];
  subfolders: FolderBrief[];
  tracks: Track[];
}
// #endregion

// #region Genre
declare interface Genre {
  id: number;
  name: string;
  color: string;
  track_count?: number;
  info?: Record<string, any>;
}
// #endregion

// #region 
declare type Track = {
  id: number;
  title: string;
  duration?: number;
  album?: AlbumBase;
  artists?: ArtistBase[];
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
  cover?: string; // transform generated property
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
  id: number;
  title: string;
  cover_art_hash?: string;
  cover?: string; // transform generated property
  track_count?: number;
}
declare interface PlaylistTrack extends Track {
  position: number;
}
declare interface PlaylistInfo extends Playlist {
  comment: string;
  created_at: string;
  tracks: PlaylistTrack[];
}
declare interface PlaylistFormPayload {
  title: string
  comment: string
  cover: File | null
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

declare interface SearchResults {
  albums: Album[];
  artists: Artist[];
  tracks: Track[];
}
