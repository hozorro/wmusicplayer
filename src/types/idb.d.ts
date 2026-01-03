declare interface IDBConfig {
  name: string;
  version: number;
  stores: {
    name: string;
    keyPath: string;
    autoIncrement?: boolean;
    isClear?: boolean;
    indexes: Array<{
      name: string;
      keyPath: string | string[];
      options?: IDBIndexParameters
    }>
  }[];
  init?: () => void;
}

declare interface IDBAlbum extends Album {  // for idb store and data transfer
  album_artist?: {id: number, name: string}
  artists: {id: number, name: string}[];
  is_deleted?: boolean;
  title_lower?: string;     // create by transform, used for not case sensitive search
  album_artist_id?: number; // create by transform
  artist_ids?: number[];    // create by transform
}

declare interface IDBArtist extends Artist {  // for idb store and data transfer
  track_count: number;
  is_deleted?: boolean;
  favorited_at?: string;  // initialized at local when rebuild, updated when download artist favs
  hit_count?: number;     // initialized at local when rebuild, updated when download artist hits
  name_lower?: string;    // create by transform, used for not case sensitive search
}

declare interface IDBFolder extends Folder {  // for idb store and data transfer
  parent_id: number;
  is_deleted?: boolean;
  root: boolean;  // create by transform
}

declare interface IDBGenre extends Genre {  // for idb store and data transfer
  is_deleted?: boolean;
}

declare interface IDBTrack extends TrackInfo {  // for idb store and data transfer
  // hit_count property of TrackInfo is initialized at local when rebuild, updated when download track hits
  // favorited_at property of TrackInfo is initialized at local when rebuild, updated when download track favs
  year?: number;
  genre_ids: number[];
  folder_id: number;
  is_deleted?: boolean;   // only transfer for determining whether to delete track in the local db, not store in the local db.
  hits?: string[];        // initialized at local when rebuild, updated when download track hits
  title_lower?: string;   // create by transform, used for not case sensitive search
  album_id?: number;      // create by transform
  artist_ids?: number[];  // create by transform
  genre_titles?: [number, string][];  // create by transform，used to create combined index of genre_id and title
}

declare interface IDBPlaylist extends Playlist {  // only for idb data reading, not for data transferring
  comment?: string;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  track_ids: number[];
  hits?: string[],        // initialized at local when rebuild, updated when download playlist hits
  hit_count?: number;     // initialized at local when rebuild, updated when download playlist hits
}

declare type IDBModel = IDBAlbum | IDBTrack | IDBArtist | IDBGenre | IDBFolder
declare type MusicEntity = 'track' | 'artist' | 'album' | 'genre' | 'folder';
declare type HitEntity = 'trackhit' | 'playlisthit'
declare type FavEntity = 'trackfav' | 'artistfav'
declare type PlaybackEntity = HitEntity | FavEntity | 'playlist'
declare type MetaType = MusicEntity | PlaybackEntity;

declare interface MetaDict {
  total_count: number;
  last_update: string;
}

declare interface IMeta<T extends MetaType> extends MetaDict {
  name: T;
}

declare interface HitsData {
  id: number;
  played_ats: string[];
}
declare interface TrackHitsData extends HitsData {
  track_id: number; 
}
declare interface ArtistHitsData {
  artist_id: number;
  hit_count: number;
}
declare interface PlaylistHitsData extends HitsData {
  playlist_id: number;
}

declare interface FavData {
  id: number;
  favorited_at: string;
}

declare interface IdbApiOptions {
    pathParams: Record<string, string>,
    queryParams: Record<string, string>,
    body?: Record<string, any>,
}

declare type MappingItem = {
  path: string, 
  handler: (options?: IdbApiOptions) => Promise<Response>
}
declare type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
declare type IdbApiDict = {
  [key in HTTPMethod]?: MappingItem[]
}
