import { generalAlova } from "..";
import { getISOWithOffset } from "@/utilies/time-text";

// const baseSrcURL = import.meta.env.VITE_BASE_SRC_URL;

export const login = (username: string, password: string) => { 
  const formData = new FormData();
  formData.append('username', username);
  formData.append('password', password);
  const method = generalAlova.Post<{'access_token': string, 'refresh_token': string, 'token_type': string}>('/auth/login', formData)
  method.meta = { authRole: 'login' }
  return method;
}
export const refreshToken = () => { 
  const method = generalAlova.Get<{access_token: string, token_type: string}>('/auth/refresh')
  method.meta = { authRole: 'refreshToken' }
  return method;
}
export const getCurrentUser = () => { 
  return generalAlova.Get("/auth/me")
}

// #region Album
export const getAlbum = (id: number) => {
  return generalAlova.Get("/music/album/" + id, {
    name: 'getalbum',
    transform: (rawData: AlbumInfo) => {
      // 使用transform时，在transform函数中指定data的类型，不要在上面的Get中使用类型泛型，否则rawData的类型会变为unknown
      // 并且当响应错误时，获取的rawData为空，此时transform函数中对于用到rawwData的属性进行赋值，会报错，应增加判断或使用.?链式运算符
      return {
        ...rawData,
        track_count: rawData?.tracks.length || 0,
        cover: `/api/artwork/album/${rawData?.id}`,
      }
    }
  })
}
// #endregion

// #region Artist
export const getTenArtists = () => { 
  return generalAlova.Get("/music/artist/tenartists",{
    name: 'gettenartists',
    transform: (rawData: Omit<Artist, 'pinyin_initial'>[]) => {
      return rawData.map(artist => ({
        ...artist,
        cover: `/api/artwork/artist/${artist.id}?img_cate=face`,
      }))
    },
    hitSource: /^transfer/
  })
}
export const getArtistChars = () => { 
  return generalAlova.Get("/music/artist/artistchars", {
    name: 'getartistchars',
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
    name: 'getartists',
    transform: (rawData: Artist[]) => {
      return rawData.map(artist => ({
        ...artist,
        cover: `/api/artwork/artist/${artist.id}?img_cate=face`,
      }))
    }
  })
}
export const getFavoritedArtists = () => {
  return generalAlova.Get("/music/artist/favoritedartists", {
    name: 'getfavoritedartists',
    transform: (rawData: Omit<Artist, 'pinyin_initial'>[]) => {
      return rawData.map(artist => ({
        ...artist,
        cover: `/api/artwork/artist/${artist.id}?img_cate=face`,
      }))
    }
  })
}
export const getArtist = (id: number) => {
  return generalAlova.Get("/music/artist/" + id, {
    name: 'getartist',
    transform: (rawData: ArtistInfo) => {
      return {
        ...rawData,
        main_albums: rawData?.main_albums.map(item => ({...item, cover: `/api/artwork/album/${item.id}`})),
        track_albums: rawData?.track_albums.map(item => ({...item, cover: `/api/artwork/album/${item.id}`})),
        top_tracks: rawData?.top_tracks.map(item => ({...item, cover: `/api/artwork/track/${item.id}`})),
        cover: `/api/artwork/artist/${rawData?.id}?img_cate=portrait`,        
      }
    }
  })
}
// #endregion

// #region Folder
export const getFolder = (id: number) => {
  return generalAlova.Get("/music/folder/" + id, {
    name: 'getfolder',
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
    name: 'getrandomgenres',
    hitSource: /^transfer/
  });
}
export const getGenres = () => { 
  return generalAlova.Get("/music/genre/genres", {
    name: 'getgenres',
    transform: (rawData: Genre[]) => {
      return rawData.map(genre => ({
        ...genre,
        cover: new URL('/src/assets/imgs/genrec.png', import.meta.url).href,
      }))
    }
  })
}
export const getGenre = (id: string) => {
  return generalAlova.Get<Genre>("/music/genre/" + id, {name: 'getgenre'})
}
export const getGenreTracks = (id: string, page: number, pageSize: number, lastKey: string | null) => {
  const options = { params: { page, page_size: pageSize } as Record<string, any>, cacheFor: 0, name: 'getgenretracks' }
  if(lastKey) options.params.last_key = lastKey
  return generalAlova.Get<{total: number, tracks: Track[], next_key?: string}>(`/music/genre/${id}/tracks`, options)
}
// #endregion

// #region Playlist
export const getTopPlaylists = () => {
  return generalAlova.Get("/music/playlist/topplaylists",{
    name: 'gettopplaylists',
    transform: (rawData: Playlist[]) => {
      return rawData.map(playlist => ({
        ...playlist,
        cover: `/api/artwork/playlist/${playlist.id}`,
      }))
    },
    hitSource: /^transfer/
  });
}
export const getPlaylists = () => {
  return generalAlova.Get("/music/playlist/playlists",{
    name: 'getplaylists',
    transform: (rawData: Playlist[]) => {
      return rawData.map(playlist => ({
        ...playlist,
        cover: `/api/artwork/playlist/${playlist.id}`,
      }))
    },
    hitSource: ['addplaylist', 'addnewplaylist', 'updateplaylist', /^transfer/]
  });
}
export const getPlaylist = (id: number | string) => {
  return generalAlova.Get("/music/playlist/" + id, {
    name: 'getplaylist',
    transform: (rawData: PlaylistInfo) => {
      return {
        ...rawData,
        cover: `/api/artwork/playlist/${rawData?.id}`,
        tracks: rawData?.tracks.map(item => ({...item, cover: `/api/artwork/track/${item.id}`})),
      }
    },
    hitSource: ['addtracktoplaylist', 'removetrackfromplaylist', /^transfer/]
  });
};
export const addPlaylist = (formData:FormData) => {
  return generalAlova.Post<PlaylistInfo>("/music/playlist/addplaylist", formData, {name: 'addplaylist', timeout: 1000 * 60 * 10});
};
export const editPlaylist = (formData: FormData) => { 
  return generalAlova.Put<Partial<PlaylistInfo>>("/music/playlist/updateplaylist", formData, {name: 'updateplaylist', timeout: 1000 * 60 * 10});
};
export const addNewPlaylist = (title: string) => { 
  return generalAlova.Post<Playlist>("/music/playlist/addplaylistsimple", {title}, {name: 'addnewplaylist'});
};
export const addTrackToPlaylist = (playlist_id: number | string, track_id: number) => {
  return generalAlova.Put("/music/playlist/addtracktoplaylist", {playlist_id, track_id}, {cacheFor: 0, name: 'addtracktoplaylist'});
};
export const removeTrackFromPlaylist = (playlist_id: number | string, track_id: number) => { 
  return generalAlova.Put("/music/playlist/removetrackfromplaylist", {playlist_id, track_id}, {cacheFor: 0, name: 'removetrackfromplaylist'});
};
// #endregion

// #region Track
export const getTrackInfo = (id: number) => {
  return generalAlova.Get<TrackInfo>("/music/track/" + id, {name: 'track'});
};
export const getTrackMoreInfo = (id: number) => { 
  return generalAlova.Get<TrackMoreInfo>("/music/track/moreinfo/" + id, {name: 'trackmoreinfo'})
}
export const getStreamingUrl = (id: number) => { 
  return generalAlova.Get<string>("/music/track/signed-url/" + id, {name: 'streamingurl'})
}
export const getRandomTracks = (num?: number) => { 
  return generalAlova.Get<Track[]>("/music/track/randomtracks?num=" + num, {name: 'randomtracks'})
}
export const getArtistRandomTracks = (id: number, num?: number) => { 
  return generalAlova.Get<Track[]>("/music/track/artistrandomtracks?artist_id=" + id + "&num=" + num, {name: 'artistrandomtracks'})
}
export const getGenreRandomTracks = (id: number, num?: number) => { 
  return generalAlova.Get<Track[]>("/music/track/genrerandomtracks?genre_id=" + id + "&num=" + num, {name: 'genrerandomtracks'})
}
export const getFavoriteTracks = () => { 
  return generalAlova.Get("/music/track/favoritetracks",{
    name: 'favoritetracks',
    transform: (rawData: Track[]) => {
      return rawData.map(track => ({
        ...track,
        cover: `/api/artwork/track/${track.id}`,
      }))
    }
  })
}
export const getLatestTracks = () => {
  return generalAlova.Get("/music/track/latesttracks",{
    name: 'latesttracks',
    transform: (rawData: Track[]) => {
      return rawData.map(track => ({
        ...track,
        cover: `/api/artwork/track/${track.id}`
      }))
    }
  });
};
export const getMostPlayedTracks  = () => { 
  return generalAlova.Get("/music/track/mostplayedtracks",{
    name: 'mostplayedtracks',
    transform: (rawData: Track[]) => {
      return rawData.map(track => ({
        ...track,
        cover: `/api/artwork/track/${track.id}`
      }))
    }
  });
};
export const favTrack = (track_id: number, is_favorited: boolean) => { 
  return generalAlova.Put<{is_favorited: boolean}>('music/track/favorite/' + track_id, {
    is_favorited,
    favorited_at: getISOWithOffset(),
  }, {name: 'favtrack'})
};
export const testTrack = () => { 
  return generalAlova.Get<string[]>("/music/track/test/testtime", {name: 'testtrack'})
};
export const getCollectionTracks = (collection_id: number, collection_type: Exclude<PopType, 'track'>) => { 
  return generalAlova.Get<Track[]>('/music/track/collection/' + collection_type + '/' + collection_id, {name: 'collectiontracks'})
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
              cover = `/api/artwork/track/${item.id}`
              break;
            case 'album':
              cover = `/api/artwork/album/${item.id}`
              break
            case 'artist':
              cover = `/api/artwork/artist/${item.id}?img_cate=face`
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
  return generalAlova.Get<Track[]>('/rndartisttracks?num=' + num + '&numpa=1', {name: 'rndartisttracks'})
}
export const getRandomConstraintedArtistTracks = (num: number, numpa: number) => { 
  return generalAlova.Get<Track[]>('/rndartisttracks?num=' + num + '&numpa=' + numpa)
}
export const getRandomWeightedArtistTracks = (num: number, weightRate: number) => { 
  return generalAlova.Get<Track[]>('/rndwgttracks?num=' + num + '&weight=' + weightRate, {name: 'rndwgttracks'})
}
export const getRandomHitsWeightedTracks = (num: number, weightRate: number) => { 
  return generalAlova.Get<Track[]>('/rndhitswgttracks?num=' + num + '&weight=' + weightRate, {name: 'rndhitswgttracks'})
}

// #endregion
export const getLyric = (id: number) => { 
  return generalAlova.Get<string>('/music/track/lyric/' + id, {name: 'lyric'})
}

export const delLyric = (id: number) => { 
  return generalAlova.Delete<string>('/music/track/lyric/' + id, {name: 'dellyric'})
}