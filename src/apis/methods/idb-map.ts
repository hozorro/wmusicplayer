import { indexedDbHelper } from "@/apis/idb-funcs";
import regIdbApis from './idb-music'

export default function mappingIdbApis(idbHelper: indexedDbHelper): IdbApiDict { 
  const idbApis = regIdbApis(idbHelper)
  return {
    GET: [  
      // registerRoute will match sequently, so path with variables should be at the last place. 
      // i.e., getgenretracks first, getgenres followed, getgenre at last
      {path: 'album/{id}', handler: idbApis.getAlbum},
      {path: 'artist/tenartists', handler: idbApis.getTenArtists},
      {path: 'artist/favoritedartists', handler: idbApis.getFavoritedArtists},
      {path: 'artist/artistchars', handler: idbApis.getArtistChars},
      {path: 'artist/artists/{char}', handler: idbApis.getArtists},
      {path: 'artist/{id}', handler: idbApis.getArtist},
      {path: 'folder/{id}', handler: idbApis.getFolder},
      {path: 'genre/randomgenres', handler: idbApis.getRandomGenres},
      {path: 'genre/genres', handler: idbApis.getGenres},
      {path: 'genre/{id}/tracks', handler: idbApis.getGenreTracks},
      {path: 'genre/{id}', handler: idbApis.getGenre},
      {path: 'track/randomtracks', handler: idbApis.getRandomTracks},
      {path: 'track/artistrandomtracks', handler: idbApis.getArtistRandomTracks},
      {path: 'track/genrerandomtracks', handler: idbApis.getGenreRandomTracks},
      {path: 'track/favoritetracks', handler: idbApis.getFavoriteTracks},
      {path: 'track/latesttracks', handler: idbApis.getLatestTracks},
      {path: 'track/mostplayedtracks', handler: idbApis.getMostPlayedTracks},
      {path: 'track/collection/{collection_type}/{collection_id}', handler: idbApis.getCollectionTracks},
      {path: 'track/rndartisttracks', handler: idbApis.getRandomArtistTracks},
      {path: 'track/rndwgttracks', handler: idbApis.getRandomWeightedArtistTracks},
      {path: 'track/rndhitswgttracks', handler: idbApis.getRandomHitsWeightedTracks},
      {path: 'track/{id}', handler: idbApis.getTrack},
      {path: 'playlist/topplaylists', handler: idbApis.getTopPlaylists},
      {path: 'playlist/playlists', handler: idbApis.getPlaylists},
      {path: 'playlist/{id}', handler: idbApis.getPlaylist},
      {path: 'search', handler: idbApis.search},
    ],
    POST: [
      {path: 'playlist/addplaylistsimple', handler: idbApis.addNewPlaylist},
    ],
    PUT: [
      {path: 'track/favorite/{track_id}', handler: idbApis.favoriteTrack},
      {path: 'playlist/addtracktoplaylist', handler: idbApis.addTrackToPlaylist},
      {path: 'playlist/removetrackfromplaylist', handler: idbApis.removeTrackFromPlaylist},
    ]
  }
}