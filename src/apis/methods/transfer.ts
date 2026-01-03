import { generalAlova } from "..";

export const getDbMetaInfo = () => {
  return generalAlova.Get<DbMetaInfo[]>("/music/transfer/getdbinfo",  {name: 'db_info'})
}
export const getMusicUnsyncedCount = (model: MusicEntity, last_sync?: string) => {
  return generalAlova.Get<number>(`/music/transfer/unsynccount?entity=${model}` + (last_sync ? `&last_sync=${last_sync}` : ''), {
    name: 'db_model_info',
  })
}
export const transferAlbums = (options: TransferOptions) => {
  return generalAlova.Post("/music/transfer/albums", options, {
    name: 'transfer_albums',
    cacheFor: 0,
    transform: (rawData: IDBAlbum[]) => {
      return rawData.map(album => ({
        ...album,
        title_lower: album.title.toLowerCase(),
        album_artist_id: album.album_artist?.id,
        artist_ids: album.artists.map(artist => artist.id)
      }))
    }
  })
}

export const transferArtists = (options: TransferOptions) => {
  return generalAlova.Post("/music/transfer/artists", options, {
    name: 'transfer_artists',
    cacheFor: 0,
    transform: (rawData: IDBArtist[]) => {
      return rawData.map(artist => ({
        ...artist,
        name_lower: artist.name.toLowerCase(),
      }))
    }
  })
}

export const transferFolders = (options: TransferOptions) => {
  return generalAlova.Post("/music/transfer/folders", options, {
    name: 'transfer_folders',
    cacheFor: 0,
    transform: (rawData: IDBFolder[]) => {
      return rawData.map(folder => ({
        ...folder,
        root: folder.parent_id === null,
      }))
    }
  })
}

export const transferGenres = (options: TransferOptions) => {
  return generalAlova.Post("/music/transfer/genres", options, {name: 'transfer_genres', cacheFor: 0})
}

export const transferTracks = (options: TransferOptions) => {
  return generalAlova.Post("/music/transfer/tracks", options, {
    name: 'transfer_tracks',
    cacheFor: 0,
    transform: (rawData: IDBTrack[]) => {
      return rawData.map(track => ({
        ...track,
        title_lower: track.title.toLowerCase(),
        album_id: track.album?.id,
        artist_ids: track.artists?.map(artist => artist.id),
        genre_titles: track.genre_ids?.map(genre_id => [genre_id, track.title]) as [number, string][],
      }))
    }
  })
}

export const uploadHits = (model: 'track' | 'playlist', data: HitsData[]) => {
  return generalAlova.Post(`/music/transfer/upload/hits/${model}`, data, {cacheFor: 0})
}
export const uploadFavs = (model:  'track'| 'artist', data: {added: FavData[], removed: FavData[]}) => {
  return generalAlova.Post<number>(`/music/transfer/upload/favs/${model}`, data, {cacheFor: 0})
}
export const getHitsCount = (model: 'track' | 'artist' | 'playlist') => {
  return generalAlova.Get<number>(`/music/transfer/count/${model}/hits`)
}
export const downloadHitsList = (model: 'track' | 'playlist', options: TransferOptions) => {
  return generalAlova.Post<HitsData[]>(`/music/transfer/download/${model}/hits`, options)
}
export const downloadArtistHitsCountList = (options: TransferOptions) => {
  return generalAlova.Post<ArtistHitsData[]>('/music/transfer/download/artist/hits', options)
}
export const downloadFavs = (model: 'track'| 'artist') => {
  return generalAlova.Post<FavData[]>(`/music/transfer/download/${model}/favs`)
}
export const uploadPlaylistLists = (data: IDBPlaylist[]) => { 
  return generalAlova.Post<{total: number, created: number, updated: number}>('/music/transfer/upload/playlists', data, {cacheFor: 0})
}
export const downloadPlaylistLists = () => { 
  return generalAlova.Post<IDBPlaylist[]>('/music/transfer/download/playlists')
}