import { generalAlova } from "..";
import { TokenStorage } from "@/utilies/auth";

export const login = (username: string, password: string) => { 
  const method = generalAlova.Post<TokenData>('/auth/login', {
    username,
    password,
    device_id: TokenStorage.getDeviceId(),
  })
  method.meta = { authRole: 'login' }
  return method;
}
export const refreshToken = (refresh_token: string) => { 
  const method = generalAlova.Post<TokenData>('/auth/refresh', {refresh_token})
  method.meta = { authRole: 'refreshToken' }
  return method;
}
export const getCurrentUser = () => { 
  return generalAlova.Get("/auth/me")
}

// #region Album
export const getAlbum = (id: number) => {
  return generalAlova.Get("/music/album/" + id, {
    name: 'getAlbum',
    transform: (rawData: AlbumInfo) => {
      // not use type as typevar in the Get method, but in the transform function
      return {
        ...rawData,
        track_count: rawData?.tracks.length || 0,
        cover: `/api/artwork/album/${rawData?.id}?v=${rawData?.cover_art_hash || 'default'}`,
      }
    }
  })
}
// #endregion

// #region Artist
export const getTenArtists = () => { 
  return generalAlova.Get("/music/artist/tenartists",{
    name: 'getTenArtists',
    transform: (rawData: Omit<Artist, 'pinyin_initial'>[]) => {
      return rawData.map(artist => ({
        ...artist,
        cover: `/api/artwork/artist/${artist.id}?img_cate=face&v=${artist?.cover_art_hash || 'default'}`,
      }))
    },
    hitSource: /^transfer/
  })
}
export const getArtistChars = () => { 
  return generalAlova.Get("/music/artist/artistchars", {
    name: 'getArtistChars',
    transform: (rawData: [string,boolean][]) => {
      return rawData.map(artistChar => ({
        charName: artistChar[0],
        hasArtist: artistChar[1],
      }))
    }
  })
}
export const getArtists = (char: string) => {
  return generalAlova.Get("/music/artist/artists/" + char, {
    name: 'getArtists',
    transform: (rawData: Artist[]) => {
      return rawData.map(artist => ({
        ...artist,
        cover: `/api/artwork/artist/${artist.id}?img_cate=face&v=${artist?.cover_art_hash || 'default'}`,
      }))
    }
  })
}
export const getFavoritedArtists = () => {
  return generalAlova.Get("/music/artist/favoritedartists", {
    name: 'getFavoritedArtists',
    transform: (rawData: Omit<Artist, 'pinyin_initial'>[]) => {
      return rawData.map(artist => ({
        ...artist,
        cover: `/api/artwork/artist/${artist.id}?img_cate=face&v=${artist?.cover_art_hash || 'default'}`,
      }))
    }
  })
}
export const getArtist = (id: number) => {
  return generalAlova.Get("/music/artist/" + id, {
    name: 'getArtist',
    transform: (rawData: ArtistInfo) => {
      return {
        ...rawData,
        main_albums: rawData?.main_albums.map(item => ({...item, cover: `/api/artwork/album/${item.id}?v=${item?.cover_art_hash || 'default'}`})),
        track_albums: rawData?.track_albums.map(item => ({...item, cover: `/api/artwork/album/${item.id}?v=${item?.cover_art_hash || 'default'}`})),
        top_tracks: rawData?.top_tracks.map(item => ({...item, cover: `/api/artwork/track/${item.id}?v=${item?.cover_art_hash || 'default'}`})),
        cover: `/api/artwork/artist/${rawData?.id}?img_cate=portrait&v=${rawData?.cover_art_hash || 'default'}`,        
      }
    }
  })
}
// #endregion

// #region Folder
export const getFolder = (id: number) => {
  return generalAlova.Get("/music/folder/" + id, {
    name: 'getFolder',
    transform: (rawData: FolderInfo) => {
      return { 
        ...rawData,
        tracks: rawData?.tracks.map(item => ({...item, cover: new URL('/src/assets/imgs/trackc.png', import.meta.url).href})),
      } 
    }
  })
}
// #endregion

// #region Genre
export const getRandomGenres = () => { 
  return generalAlova.Get<Genre[]>("/music/genre/randomgenres", {
    name: 'getRandomGenres',
    hitSource: /^transfer/
  });
}
export const getGenres = () => { 
  return generalAlova.Get("/music/genre/genres", {
    name: 'getGenres',
    transform: (rawData: Genre[]) => {
      return rawData.map(genre => ({
        ...genre,
        cover: new URL('/src/assets/imgs/genrec.png', import.meta.url).href,
      }))
    }
  })
}
export const getGenre = (id: string) => {
  return generalAlova.Get<Genre>("/music/genre/" + id, {name: 'getGenre'})
}
export const getGenreTracks = (id: string, page: number, pageSize: number, lastKey: string | null) => {
  const options = { params: { page, page_size: pageSize } as Record<string, any>, cacheFor: 0, name: 'getGenreTracks' }
  if(lastKey) options.params.last_key = lastKey
  return generalAlova.Get<{total: number, tracks: Track[], next_key?: string}>(`/music/genre/${id}/tracks`, options)
}
// #endregion

// #region Playlist
export const getTopPlaylists = () => {
  return generalAlova.Get("/music/playlist/topplaylists",{
    name: 'getTopPlaylists',
    transform: (rawData: Playlist[]) => {
      return rawData.map(playlist => ({
        ...playlist,
        cover: `/api/artwork/playlist/${playlist.id}?v=${playlist?.cover_art_hash || 'default'}`,
      }))
    },
    hitSource: /^transfer/
  });
}
export const getPlaylists = () => {
  return generalAlova.Get("/music/playlist/playlists",{
    name: 'getPlaylists',
    transform: (rawData: Playlist[]) => {
      return rawData.map(playlist => ({
        ...playlist,
        cover: `/api/artwork/playlist/${playlist.id}?v=${playlist?.cover_art_hash || 'default'}`,
      }))
    },
    hitSource: ['addplaylist', 'addnewplaylist', 'updateplaylist', /^transfer/]
  });
}
export const getPlaylist = (id: number | string) => {
  return generalAlova.Get("/music/playlist/" + id, {
    name: 'getPlaylist',
    transform: (rawData: PlaylistInfo) => {
      return {
        ...rawData,
        cover: `/api/artwork/playlist/${rawData?.id}?v=${rawData?.cover_art_hash || 'default'}`,
        tracks: rawData?.tracks.map(item => ({...item, cover: `/api/artwork/track/${item.id}?v=${item?.cover_art_hash || 'default'}`})),
      }
    },
    hitSource: ['addtracktoplaylist', 'removetrackfromplaylist', /^transfer/]
  });
};
export const addPlaylist = (formData:FormData) => {
  return generalAlova.Post<Omit<PlaylistInfo, 'tracks'>>("/music/playlist/addplaylist", formData, {name: 'addPlaylist', timeout: 1000 * 60 * 10});
};
export const editPlaylist = (formData: FormData) => { 
  return generalAlova.Put<Partial<PlaylistInfo>>("/music/playlist/updateplaylist", formData, {name: 'updatePlaylist', timeout: 1000 * 60 * 10});
};
export const addNewPlaylist = (title: string) => { 
  return generalAlova.Post<Playlist | string>("/music/playlist/addplaylistsimple", {title}, {name: 'addNewPlaylist'});
};
export const addTrackToPlaylist = (playlist_id: number | string, track_id: number) => {
  return generalAlova.Put("/music/playlist/addtracktoplaylist", {playlist_id, track_id}, {cacheFor: 0, name: 'addTrackToPlaylist'});
};
export const removeTrackFromPlaylist = (playlist_id: number | string, track_id: number) => { 
  return generalAlova.Put("/music/playlist/removetrackfromplaylist", {playlist_id, track_id}, {cacheFor: 0, name: 'removeTrackFromPlaylist'});
};
// #endregion

// #region Track
export const getTrackInfo = (id: number) => {
  return generalAlova.Get<TrackInfo>("/music/track/" + id, {name: 'getTrackInfo'});
};
export const getTrackMoreInfo = (id: number) => { 
  return generalAlova.Get<TrackMoreInfo>("/music/track/moreinfo/" + id, {name: 'getTrackMoreInfo'})
}
export const getStreamingUrl = (id: number) => { 
  return generalAlova.Get<string>("/music/track/signed-url/" + id, {name: 'getStreamingUrl'})
}
export const getRandomTracks = (num?: number) => { 
  return generalAlova.Get<Track[]>("/music/track/randomtracks?num=" + num, {name: 'getRandomTracks'})
}
export const getArtistRandomTracks = (id: number, num?: number) => { 
  return generalAlova.Get<Track[]>("/music/track/artistrandomtracks?artist_id=" + id + "&num=" + (num || 50), {name: 'getArtistRandomTracks'})
}
export const getGenreRandomTracks = (id: number, num?: number) => { 
  return generalAlova.Get<Track[]>("/music/track/genrerandomtracks?genre_id=" + id + "&num=" + (num || 50), {name: 'getGenreRandomTracks'})
}
export const getFavoriteTracks = () => { 
  return generalAlova.Get("/music/track/favoritetracks",{
    name: 'getFavoriteTracks',
    transform: (rawData: Track[]) => {
      return rawData.map(track => ({
        ...track,
        cover: `/api/artwork/track/${track.id}?v=${track?.cover_art_hash || 'default'}`,
      }))
    }
  })
}
export const getLatestTracks = () => {
  return generalAlova.Get("/music/track/latesttracks",{
    name: 'getLatestTracks',
    transform: (rawData: Track[]) => {
      return rawData.map(track => ({
        ...track,
        cover: `/api/artwork/track/${track.id}?v=${track?.cover_art_hash || 'default'}`
      }))
    }
  });
};
export const getMostPlayedTracks  = () => { 
  return generalAlova.Get("/music/track/mostplayedtracks",{
    name: 'getMostPlayedTracks',
    transform: (rawData: Track[]) => {
      return rawData.map(track => ({
        ...track,
        cover: `/api/artwork/track/${track.id}?v=${track?.cover_art_hash || 'default'}`
      }))
    }
  });
};
export const favTrack = (track_id: number, is_favorited: boolean) => { 
  return generalAlova.Put<string>('music/track/favorite/' + track_id, {
    is_favorited,
  }, {name: 'favTrack'})
};
export const testTrack = () => { 
  return generalAlova.Get<string[]>("/music/track/test/testtime", {name: 'testTrack'})
};
export const getCollectionTracks = (collection_id: number, collection_type: Exclude<PopType, 'track'>) => { 
  return generalAlova.Get<Track[]>('/music/track/collection/' + collection_type + '/' + collection_id, {name: 'getCollectionTracks'})
};
// #endregion

// #region advanced
export const search = <T extends Track | Artist | Album>(cat: 'album' | 'artist' | 'track', keyword: string, page: number, pageSize: number, lastKey: string | null) => { 
  const options = { params: { cat, kw: keyword, page, page_size: pageSize } as Record<string, any>, name: 'search' }
  if(lastKey) options.params.cursor = lastKey
  return generalAlova.Get('/music/search', {
    ...options,
    transform: (rawData: {total: number, data: T[], next_key?: string}) => {
      return {
        total: rawData.total,
        data: rawData.data.map(item => {
          let cover
          switch(cat) { 
            case 'track':
              cover = `/api/artwork/track/${item.id}?v=${item?.cover_art_hash || 'default'}`
              break;
            case 'album':
              cover = `/api/artwork/album/${item.id}?v=${item?.cover_art_hash || 'default'}`
              break
            case 'artist':
              cover = `/api/artwork/artist/${item.id}?img_cate=face&v=${item?.cover_art_hash || 'default'}`
              break
          }
          return {...item, cover}
        }),
        next_key: rawData.next_key
      }
    }
  })
}

export const getRandomArtistTracks = (num: number) => { 
  return generalAlova.Get<Track[]>('/music/track/rndartisttracks?num=' + num + '&numpa=1', {name: 'getRandomArtistTracks'})
}
export const getRandomConstraintedArtistTracks = (num: number, numpa: number) => { 
  return generalAlova.Get<Track[]>('/music/track/rndartisttracks?num=' + num + '&numpa=' + numpa, {name: 'getRandomConstraintedArtistTracks'})
}
export const getRandomWeightedArtistTracks = (num: number, weightRate: number) => { 
  return generalAlova.Get<Track[]>('/music/track/rndwgttracks?num=' + num + '&weight=' + weightRate, {name: 'getRandomWeightedArtistTracks'})
}
export const getRandomHitsWeightedTracks = (num: number, weightRate: number) => { 
  return generalAlova.Get<Track[]>('/music/track/rndhitswgttracks?num=' + num + '&weight=' + weightRate, {name: 'getRandomHitsWeightedTracks'})
}

// #endregion
export const getLyric = (id: number) => { 
  return generalAlova.Get<string>('/music/track/lyric/' + id, {name: 'getLyric'})
}

export const delLyric = (id: number) => { 
  return generalAlova.Delete<string>('/music/track/lyric/' + id, {name: 'delLyric'})
}