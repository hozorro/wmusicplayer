declare interface ResponseData<T> {
  code: number;
  msg: string;
  data: T;
}
// #region Album
declare interface Album {
  id: string;
  name: string;
}

declare interface AlbumInfo extends Album { 
  artists: Artist[];
  artist: Artist;
  track_count: number;
  track_list: Track[];
}

declare interface IndexeddbAlbumInfo extends Album {
  artists: Artist[];
  tracks: {id: string, title: string}[]
}
// #endregion

// #region Artist
declare interface Artist {
  id: string;
  name: string;
  start_char: string;
}

declare interface ArtistInfo extends Artist { 
  album_count: number;
  track_count: number;
  album_list: Album[];
  top20_tracks: Track[];
}

declare interface IndexeddbArtistInfo extends Artist {
  albums: Album[];
  track_count: number;
  hit: number[];
}
// #endregion

// #region Folder
declare interface Folder {
  id: number;
  name: string;
}

declare interface FolderInfo extends Folder {
  parent: number;
  sub_folders: Folder[];
  tracks: Track[];
}

declare interface IndexeddbFolderInfo extends Folder {
  parent: number;
  root: boolean;
  path: string;
  cover_art: string;
  created: string;
  last_scan: number;
  tracks: {id: string, title: string}[];
}
// #endregion

// #region Genre
declare interface Genre {
  id: string;
  name: string;
  info?: string;
}

declare interface IndexeddbGenreInfo extends Genre {
  track_count: number;
}
// #endregion

// #region Track
declare interface TrackInfo {
  id: string;
  title: string;
  artists?: {id: string, name: string}[];
  album: string;
  album_id?: string;
  duration: number;
  starred: boolean;
  cover?: string;
}

declare interface IndexeddbTrackInfo extends TrackInfo {
  year: number;
  artists: Artist[];
  genres: Genre[];
  folder: number;
  hit: number[];
}

declare type Track = {
  id: string;
  title: string;
  artists?: string[];
};
// #endregion

// #region Playlist
declare interface PlaylistInfo {
  id: string;
  name: string;
  comment: string;
  created: string;
  tracks: Track[];
  cover?: string;
}

declare interface IndexeddbPlaylistInfo extends PlaylistInfo {
  cover:  string;
  hit: number[];
}

declare type Playlist = Pick<PlaylistInfo, "id" | "name" | "cover">;
// #endregion
