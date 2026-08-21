/**
 * example:
 *  path: /api/album/:id
 *  local: idbGetAlbum(idb/sw-api/album.ts)
 *  remote: getAlbum(apis/methods/music.ts) —— type only 引入，编译期存在性检查，运行时零成本
 */

import { route } from './router'
import { idbGetAlbum } from '@/idb/sw-api/endpoints/albums'
import { idbGetTenArtists, idbGetFavArtists, idbGetArtistChars, idbGetArtists, idbGetArtist } from '@/idb/sw-api/endpoints/artists'
import { idbGetFolder } from '@/idb/sw-api/endpoints/folders'
import { idbGetRandomGenres, idbGetGenres, idbGetGenre, idbGetGenreTracks } from '@/idb/sw-api/endpoints/genres'
import { idbGetTopPlaylists, idbGetPlaylists, idbGetPlaylist } from '@/idb/sw-api/endpoints/playlists'
import { 
  idbGetTrack, idbSearch,
  idbGetRandomTracks, idbGetArtistRandomTracks, idbGetGenreRandomTracks,
  idbGetLatestTracks, idbGetHotTracks, idbGetCollectionTracks,
  idbGetRndArtistSctdTracks, idbGetWgtRndArtistTracks, idbGetWgtRndTracks,
  idbGetTrackHits
} from '@/idb/sw-api/endpoints/tracks'
import { idbFavoritedTracks, idbFavoritedTrackIds } from '@/idb/sw-api/endpoints/tracks'

import type { 
  getAlbum, 
  getTenArtists, getFavoritedArtists, getArtistChars, getArtists, getArtist,
  getFolder, 
  getRandomGenres, getGenres, getGenre, getGenreTracks,
  getTopPlaylists, getPlaylists, getPlaylist,
  getTrackInfo, getRandomTracks, getArtistRandomTracks, getGenreRandomTracks,
  getLatestTracks, getHotTracks, getCollectionTracks,
  getRandomConstraintedArtistTracks, getRandomWeightedArtistTracks, getRandomHitsWeightedTracks,
  getFavoriteTracks, getFavoriteTrackIds, 
  searchLibrary,
  getTrackHits
} from '@/apis/methods/music'

/**
 * remoteXXX:  type only 引入，编译期存在性检查，运行时零成本
 * 仅作对照声明, 变更此处编译失败
 */

// "/music/album/" + id: getAlbum
export type remoteGetAlbum = typeof getAlbum  
route('/api/music/album/:id', idbGetAlbum)

// "/music/artist/tenartists": getTenArtists
export type remoteGetTenArtists = typeof getTenArtists
route('/api/music/artist/tenartists', idbGetTenArtists)

// "/music/artist/favoritedartists": getFavoritedArtists
export type remoteGetFavArtists = typeof getFavoritedArtists
route('/api/music/artist/favoritedartists', idbGetFavArtists)

// "/music/artist/artistchars": getArtistChars
export type remoteGetArtistChars = typeof getArtistChars
route('/api/music/artist/artistchars', idbGetArtistChars)

// "/music/artist/artists/" + char: getArtists
export type remoteGetArtists = typeof getArtists
route('/api/music/artist/artists/:char', idbGetArtists)

// "/music/artist/" + id: getArtist
export type remoteGetArtist = typeof getArtist
route('/api/music/artist/:id', idbGetArtist)

// "/music/folder/" + id: getFolder
export type remoteGetFolder = typeof getFolder
route('/api/music/folder/:id', idbGetFolder)

// "/music/genre/randomgenres": getRandomGenres
export type remoteGetRandomGenres = typeof getRandomGenres
route('/api/music/genre/randomgenres', idbGetRandomGenres)

// "/music/genre/genres": getGenres
export type remoteGetGenres = typeof getGenres
route('/api/music/genre/genres', idbGetGenres)

// `/music/genre/${id}/tracks`: getGenreTracks, Query: { page, page_size}
export type remoteGetGenreTracks = typeof getGenreTracks
route('/api/music/genre/:id/tracks', idbGetGenreTracks)

// "/music/genre/" + id: getGenre
export type remoteGetGenre = typeof getGenre
route('/api/music/genre/:id', idbGetGenre)

// "/music/track/randomtracks?num=" + num: getRandomTracks
export type remoteGetRandomTracks = typeof getRandomTracks
route('/api/music/track/randomtracks', idbGetRandomTracks)

// "/music/track/artistrandomtracks?artist_id=" + id + "&num=": getArtistRandomTracks
export type remoteGetArtistRandomTracks = typeof getArtistRandomTracks
route('/api/music/track/artistrandomtracks', idbGetArtistRandomTracks)

// "/music/track/genrerandomtracks?genre_id=" + id + "&num=": getGenreRandomTracks
export type remoteGetGenreRandomTracks = typeof getGenreRandomTracks
route('/api/music/track/genrerandomtracks', idbGetGenreRandomTracks)

// "/music/track/favoritetracks?num=" + num: getFavoriteTracks
export type remoteGetFavoriteTracks = typeof getFavoriteTracks
route('/api/music/track/favoritetracks', idbFavoritedTracks)

// "/music/track/favoritetrackids?num=" + num: getFavoriteTrackIds
export type remoteGetFavoriteTrackIds = typeof getFavoriteTrackIds
route('/api/music/track/favoritetrackids', idbFavoritedTrackIds)

// "/music/track/latesttracks": getLatestTracks
export type remoteGetLatestTracks = typeof getLatestTracks
route('/api/music/track/latesttracks', idbGetLatestTracks)

// "/music/track/mostplayedtracks": getHotTracks
export type remoteGetHotTracks = typeof getHotTracks
route('/api/music/track/mostplayedtracks', idbGetHotTracks)

// '/music/track/collection/' + collection_type + '/' + collection_id: getCollectionTracks
export type remoteGetCollectionTracks = typeof getCollectionTracks
route('/api/music/track/collection/:ctype/:cid', idbGetCollectionTracks)

// '/music/track/rndartisttracks?num=' + num + '&numpa=1': getRandomConstraintedArtistTracks
export type remoteGetRandomArtistTracks = typeof getRandomConstraintedArtistTracks
route('/api/music/track/rndartisttracks', idbGetRndArtistSctdTracks)

// '/music/track/rndwgttracks?num=' + num + '&weight=' + weightRate: getRandomWeightedArtistTracks
export type remoteGetRandomWeightedArtistTracks = typeof getRandomWeightedArtistTracks
route('/api/music/track/rndwgttracks', idbGetWgtRndArtistTracks)

// '/music/track/rndhitswgttracks?num=' + num + '&weight=' + weightRate: getRandomHitsWeightedTracks
export type remoteGetRandomHitsWeightedTracks = typeof getRandomHitsWeightedTracks
route('/api/music/track/rndhitswgttracks', idbGetWgtRndTracks)

// "/music/track/" + id: getTrackInfo
export type remoteGetTrackInfo = typeof getTrackInfo
route('/api/music/track/:id', idbGetTrack)

// "/music/playback/topplaylists": getTopPlaylists
export type remoteGetTopPlaylists = typeof getTopPlaylists
route('/api/music/playback/topplaylists', idbGetTopPlaylists)

// "/music/playback/playlists": getPlaylists
export type remoteGetPlaylists = typeof getPlaylists
route('/api/music/playback/playlists', idbGetPlaylists)

// "/music/playback/gettrackhits/" + track_id: getTrackHits
export type remoteGetTrackHits = typeof getTrackHits
route('/api/music/playback/gettrackhits/:track_id', idbGetTrackHits)

// "/music/playback/" + id: getPlaylist
export type remoteGetPlaylist = typeof getPlaylist
route('/api/music/playback/:id', idbGetPlaylist)

// "/music/search?kw=" + kw + "&num=" + (limit ?? 50): searchLibrary
export type remoteSearch = typeof searchLibrary
route('/api/music/search', idbSearch)
