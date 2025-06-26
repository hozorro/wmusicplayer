import { generalAlova, uploadAlova } from "..";

const baseSrcURL = import.meta.env.VITE_BASE_SRC_URL;
const staticBaseUrl = import.meta.env.VITE_BASE_STATIC_URL + 'photos/playlist/thumbs/s_'

// #region Album
export const getAlbum = (id: string) => {
  return generalAlova.Get("/getalbum/" + id, {
    transform: (rawData: AlbumInfo) => {
      // 使用transform时，在transform函数中指定data的类型，不要在上面的Get中使用类型泛型，否则rawData的类型会变为unknown
      // 并且当响应错误时，获取的rawData为空，此时transform函数中对于用到rawwData的属性进行赋值，会报错，应增加判断或使用.?链式运算符
      return {
        ...rawData,
        cover: baseSrcURL + 'getcover?size=512&id=' + rawData?.id,
      }
    }
  })
}
// #endregion

// #region Artist
export const getTenArtists = () => { 
  return generalAlova.Get("/gettenartists",{
    transform: (rawData: Artist[]) => {
      return rawData.map(artist => ({
        ...artist,
        cover: baseSrcURL + 'getartistart?type=face&id=' + artist.id,
      }))
    }
  })
}
export const getArtistChars = () => { 
  return generalAlova.Get("/getartistchars", {
    transform: (rawData: [string,boolean][]) => {
      return rawData.map(artistChar => ({
        charName: artistChar[0],
        hasArtist: artistChar[1],
      }))
    }
  })
}
export const getArtists = (char: string) => {
  return generalAlova.Get("/getartists/" + char, {
    transform: (rawData:{id:string,name:string,list_data:Artist[]}) => {
      return {
        id: rawData?.id,
        name: rawData?.name,
        artists: rawData?.list_data.map(artist => ({
          ...artist,
          cover: baseSrcURL + 'getartistart?type=face&id=' + artist.id,
        })
      )}
    }
  })
}
export const getArtist = (id: string) => {
  return generalAlova.Get("/getartist/" + id, {
    transform: (rawData: ArtistInfo) => {
      return {
        ...rawData,
        album_list: rawData?.album_list.map(item => ({...item, cover: baseSrcURL + 'getcover?size=512&id=' + item.id})),
        top20_tracks: rawData?.top20_tracks.map(item => ({...item, cover: baseSrcURL + 'getcover?size=512&id=' + item.id})),
        cover: baseSrcURL + 'getartistart?type=portrait&id=' + rawData?.id,        
      }
    }
  })
}
// #endregion

// #region Folder
export const getFolder = (id: string) => {
  return generalAlova.Get("/getfolder/" + id, {
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
  return generalAlova.Get("/getrandomgenres", {
    transform: (rawData: Genre[]) => {
      return rawData.map(genre => ({
        ...genre,
        bgColor: genre.info,
      }))
    }
  });
}
export const getGenres = () => { 
  return generalAlova.Get("/getgenres", {
    transform: (rawData: Genre[]) => {
      return rawData.map(genre => ({
        ...genre,
        cover: new URL('/src/assets/imgs/genrec.png', import.meta.url).href,
      }))
    }
  })
}
export const getGenre = (id: string) => {
  return generalAlova.Get<Genre>("/getgenre/" + id)
}
export const getGenreTracks = (id: string, page: number, pageSize: number) => {
  return generalAlova.Get<{total: number, tracks: Track[]}>("/getgenretracks/" + id, {
    params: { page, page_size: pageSize }
  })
}
// #endregion

// #region Playlist
export const getTopPlaylists = () => {
  return generalAlova.Get("/gettopplaylists",{
    transform: (rawData: Playlist[]) => {
      return rawData.map(playlist => ({
        ...playlist,
        cover: staticBaseUrl + playlist.id,
      }))
    }
  });
}
export const getPlaylists = () => {
  return generalAlova.Get("/getplaylists",{
    transform: (rawData: Playlist[]) => {
      return rawData.map(playlist => ({
        ...playlist,
        cover: staticBaseUrl + playlist.id,
      }))
    }
  });
}
export const getPlaylist = (id: string) => {
  return generalAlova.Get("/getplaylist/" + id, {
    transform: (rawData: PlaylistInfo) => {
      return {
        ...rawData,
        cover: baseSrcURL + 'getplaylistcover?id=' + rawData?.id,
        tracks: rawData?.tracks.map(item => ({...item, cover: baseSrcURL + 'getcover?size=512&id=' + item.id})),
      }
    }
  });
};
export const addPlaylist = (formData:FormData) => {
  return uploadAlova.Post("/addplaylist", formData);
};
export const editPlaylist = (formData: FormData) => { 
  return uploadAlova.Post("/updateplaylist", formData);
};
export const addNewPlaylist = (name: string) => { 
  return generalAlova.Get<Playlist>("/addnewplaylist?name=" + name);
};
export const addTrackToPlaylist = (pid: string, tid: string) => {
  return uploadAlova.Get("/addtracktoplaylist?pid=" + pid + "&tid=" + tid);
};
// #endregion

// #region Track
export const getTrackInfo = (id:string) => {
  return generalAlova.Get<TrackInfo>("/track/" + id);
};
export const getRandomTracks = (num?: number) => { 
  return generalAlova.Get<Track[]>("/randomtracks?num=" + num)
}
export const getArtistRandomTracks = (id: string, num?: number) => { 
  return generalAlova.Get<Track[]>("/artistrandomtracks?id=" + id + "&num=" + num)
}
export const getGenreRandomTracks = (id: string, num?: number) => { 
  return generalAlova.Get<Track[]>("/genrerandomtracks?id=" + id + "&num=" + num)
}
export const getFavoriteTracks = () => { 
  return generalAlova.Get("/favoritetracks",{
    transform: (rawData: Track[]) => {
      return rawData.map(track => ({
        ...track,
        cover: baseSrcURL + 'getcover?size=512&id=' + track.id,
      }))
    }
  })
}
export const getLatestTracks = () => {
  return generalAlova.Get("/latesttracks",{
    transform: (rawData: Track[]) => {
      return rawData.map(track => ({
        ...track,
        cover: baseSrcURL + 'getcover?size=512&id=' + track.id,
        artists: track.artists?.join(', ')
      }))
    }
  });
};
export const getMostPlayedTracks  = () => { 
  return generalAlova.Get("/mostplayedtracks",{
    transform: (rawData: Track[]) => {
      return rawData.map(track => ({
        ...track,
        cover: baseSrcURL + 'getcover?size=512&id=' + track.id,
        artists: track.artists?.join(', ')
      }))
    }
  });
};
export const starTrack = (id: string, starred: boolean) => { 
  return generalAlova.Get<{starred: boolean}>('/startrack/' + id + '?starred=' + starred)
};
export const getCollectionTracks = (id: string | number, ctype: string) => { 
  return generalAlova.Get<Track[]>('/getcollectiontracks?id=' + id + '&ctype=' + ctype)
};
// #endregion