import { generalAlova } from "..";
import type { RandomModeKey } from "@/services/random-model";
import { TokenStorage } from "@/utilies/auth";
import { coverUrl } from "@/services/transform";

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
        cover: coverUrl('album', rawData.id, rawData.cover_art_hash),
      }
    }
  })
}
// #endregion

// #region Artist
export const getTenArtists = () => { 
  return generalAlova.Get("/music/artist/tenartists",{
    name: 'getTenArtists',
    transform: (rawData: Artist[]) => {
      return rawData.map(artist => ({
        ...artist,
        cover: coverUrl('artist', artist.id, artist.face_art_hash, 'face'),
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
        cover: coverUrl('artist', artist.id, artist.face_art_hash, 'face'),
      }))
    }
  })
}
export const getFavoritedArtists = () => {
  return generalAlova.Get("/music/artist/favoritedartists", {
    name: 'getFavoritedArtists',
    transform: (rawData: Artist[]) => {
      return rawData.map(artist => ({
        ...artist,
        cover: coverUrl('artist', artist.id, artist.face_art_hash, 'face'),
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
        main_albums: rawData?.main_albums.map(item => ({...item, cover: coverUrl('album', item.id, item.cover_art_hash)})),
        track_albums: rawData?.track_albums.map(item => ({...item, cover: coverUrl('album', item.id, item.cover_art_hash)})),
        top_tracks: rawData?.top_tracks.map(item => ({...item, cover: coverUrl('track', item.id, item.cover_art_hash)})),
        face: coverUrl('artist', rawData.id, rawData.face_art_hash, 'face'),
        portrait: coverUrl('artist', rawData.id, rawData.portrait_art_hash, 'portrait'),        
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
export const getGenre = (id: number) => {
  return generalAlova.Get<Genre>("/music/genre/" + id, {name: 'getGenre'})
}
export const getGenreTracks = (id: number, page: number, pageSize: number) => {
  // 新 IDB 系统按 page/page_size 偏移量分页（pageByIndex），无需 last_key 游标
  const options = { params: { page, page_size: pageSize }, cacheFor: 0, name: 'getGenreTracks' }
  return generalAlova.Get<{total: number, tracks: Track[]}>(`/music/genre/${id}/tracks`, options)
}
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
  return generalAlova.Get<Track[]>("/music/track/randomtracks?num=" + (num || 50), {name: 'getRandomTracks'})
}
export const getArtistRandomTracks = (id: number, num?: number) => { 
  return generalAlova.Get<Track[]>("/music/track/artistrandomtracks?artist_id=" + id + "&num=" + (num || 50), {name: 'getArtistRandomTracks'})
}
export const getGenreRandomTracks = (id: number, num?: number) => { 
  return generalAlova.Get<Track[]>("/music/track/genrerandomtracks?genre_id=" + id + "&num=" + (num || 50), {name: 'getGenreRandomTracks'})
}
export const getFavoriteTracks = (num: number = 100) => { 
  return generalAlova.Get("/music/track/favoritetracks?num=" + num, {
    name: 'getFavoriteTracks',
    transform: (rawData: Track[]) => {
      return rawData.map(track => ({
        ...track,
        cover: coverUrl('track', track.id, track.cover_art_hash),
      }))
    }
  })
}
export const getFavoriteTrackIds = (num: number = 100) => { 
  return generalAlova.Get<number[]>("/music/track/favoritetrackids?num=" + num, {name: 'getFavoriteTrackIds'})
}
export const getLatestTracks = () => {
  return generalAlova.Get("/music/track/latesttracks",{
    name: 'getLatestTracks',
    transform: (rawData: Track[]) => {
      return rawData.map(track => ({
        ...track,
        cover: coverUrl('track', track.id, track.cover_art_hash),
      }))
    }
  });
};
export const getHotTracks  = () => { 
  return generalAlova.Get("/music/track/mostplayedtracks",{
    name: 'getMostPlayedTracks',
    transform: (rawData: Track[]) => {
      return rawData.map(track => ({
        ...track,
        cover: coverUrl('track', track.id, track.cover_art_hash),
      }))
    }
  });
};

export const getCollectionTracks = (collection_id: number, collection_type: Exclude<PopType, 'track'>) => { 
  return generalAlova.Get<Track[]>('/music/track/collection/' + collection_type + '/' + collection_id, {name: 'getCollectionTracks'})
};
// #endregion

// #region advanced
export const searchLibrary = (kw: string, limit?: number) => {
  return generalAlova.Get<SearchResults>("/music/search?kw=" + kw + "&num=" + (limit ?? 50), {name: 'searchLibrary'})
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
export const getModedRandomTracks = (key: RandomModeKey, param?: number) => {
  switch (key) {
    case "pure": return getRandomTracks()
    case "artist-r": return getRandomArtistTracks(50)
    case "heat": return getRandomHitsWeightedTracks(50, param ?? 2)
    case "artist-c": return getRandomConstraintedArtistTracks(50, param ?? 2)
    case "artist-w": return getRandomWeightedArtistTracks(50, param ?? 2)
    default: return getRandomTracks()
  }
}

// #endregion

// #region lyric
export const getLyric = (id: number) => { 
  return generalAlova.Get<string>('/music/track/lyric/' + id, {name: 'getLyric'})
}

export const delLyric = (id: number) => { 
  return generalAlova.Delete<string>('/music/track/lyric/' + id, {name: 'delLyric'})
}

// #endregion

// #region playback
export const getTopPlaylists = () => {
  return generalAlova.Get("/music/playback/topplaylists",{
    name: 'getTopPlaylists',
    transform: (rawData: Playlist[]) => {
      return rawData.map(playlist => ({
        ...playlist,
        cover: coverUrl('playlist', playlist.id, playlist.cover_art_hash),
      }))
    },
    hitSource: /^transfer/
  });
}
export const getPlaylists = () => {
  return generalAlova.Get("/music/playback/playlists",{
    name: 'getPlaylists',
    transform: (rawData: Playlist[]) => {
      return rawData.map(playlist => ({
        ...playlist,
        cover: coverUrl('playlist', playlist.id, playlist.cover_art_hash),
      }))
    },
    hitSource: ['addplaylist', 'addnewplaylist', 'updateplaylist', /^transfer/]
  });
}
export const getPlaylist = (id: number) => {
  return generalAlova.Get("/music/playback/" + id, {
    name: 'getPlaylist',
    transform: (rawData: PlaylistInfo) => {
      return {
        ...rawData,
        cover: coverUrl('playlist', rawData.id, rawData.cover_art_hash),
        tracks: rawData?.tracks.map(item => ({...item, cover: coverUrl('track', item.id, item.cover_art_hash)}))
          .sort((a, b) => a.position - b.position),
      }
    },
    hitSource: ['addtracktoplaylist', 'removetrackfromplaylist', /^transfer/]
  });
};
export const addPlaylist = (formData:FormData) => {
  return generalAlova.Post<Omit<PlaylistInfo, 'tracks'>>("/music/playback/addplaylist", formData, {name: 'addPlaylist', timeout: 1000 * 60 * 10});
};
export const updatePlaylist = (formData: FormData) => { 
  return generalAlova.Put<Omit<PlaylistInfo, 'tracks'>>("/music/playback/updateplaylist", formData, {name: 'updatePlaylist', timeout: 1000 * 60 * 10});
};
export const deletePlaylist = (id: number) => { 
  return generalAlova.Delete<Playlist | string>("/music/playback/deleteplaylist", {id}, {name: 'deletePlaylist'});
};
export const addTrackToPlaylist = (playlist_id: number | string, track_id: number) => {
  return generalAlova.Put("/music/playback/addtracktoplaylist", {playlist_id, track_id}, {cacheFor: 0, name: 'addTrackToPlaylist'});
};
export const removeTrackFromPlaylist = (playlist_id: number | string, track_id: number) => { 
  return generalAlova.Put("/music/playback/removetrackfromplaylist", {playlist_id, track_id}, {cacheFor: 0, name: 'removeTrackFromPlaylist'});
};
export const movePlaylistTrack = (playlist_id: number | string, track_id: number, new_position: number) => { 
  return generalAlova.Put("/music/playback/moveplaylisttrack", {playlist_id, track_id, new_position}, {cacheFor: 0, name: 'movePlaylistTrack'});
};

export const favTrack = (track_id: number, is_favorited: boolean) => { 
  return generalAlova.Put<string>('music/playback/favoritetrack', {
    track_id,
    is_favorited,
  }, {name: 'favTrack'})
};
export const favArtist = (artist_id: number, is_favorited: boolean) => { 
  return generalAlova.Put<string>('music/playback/favoriteartist', {
    artist_id,
    is_favorited,
  }, {name: 'favArtist'})
};
export const updateTrackHit = (track_id: number) => { 
  return generalAlova.Put<string>('music/playback/updatetrackhit', {
    track_id,
  }, {name: 'updateTrackHit'})
};
export const updateArtistHit = (artist_id: number) => { 
  return generalAlova.Put<string>('music/playback/updateartisthit', {
    artist_id,
  }, {name: 'updateArtistHit'})
};
export const updatePlaylistHit = (playlist_id: number) => { 
  return generalAlova.Put<string>('music/playback/updateplaylisthit', {
    playlist_id,
  }, {name: 'updatePlaylistHit'})
};
// #endregion