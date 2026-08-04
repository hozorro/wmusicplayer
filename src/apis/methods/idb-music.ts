import { indexedDbHelper, keyRange } from "@/apis/idb-funcs";
import { shuffle, dynamicSort, topWeightedLnRandom } from "@/utilies/general";

function resSucc<T>(data: T) { 
  return new Response(JSON.stringify({
    code: 200,
    msg: 'ok',
    data: data
  }), {headers: {'Content-Type': 'application/json'}})
}

function resError(code: number, msg: string){
  return new Response(JSON.stringify({
    error: 'error',
    message: msg,
  }), {
    status: code,
    headers: {'Content-Type': 'application/json'}
  })
}

function isNumberic(str: string) { 
  return /^\d+$/.test(str)
}

export default function regIdbApis(idbHelper: indexedDbHelper) {
  const idbApis: IdbApiHandlerDict = {
    // #region Album
    getAlbum: async (options?: IdbApiOptions) => {
      // const id = url.pathname.split('/').pop()
      const id = options?.pathParams?.id
      if(!id) return resError(404, 'Bad request')
      const aid = parseInt(id)
      const album = await idbHelper.get<IDBAlbum>('album', aid)
      if(!album) return resError(404, 'Album not found')
      const tracks = await idbHelper.getIndexedRange<IDBTrack>('track', 'album_id', keyRange.only(aid))
      return resSucc({
        id: album.id,
        title: album.title,
        album_artist: album.album_artist,
        artists: album.artists,
        cover_art_hash: album.cover_art_hash,
        track_count: tracks.length,
        tracks: tracks.map(track => ({
          id: track.id, 
          title: track.title, 
          artists: track.artists?.map(artist => artist.name),
          duration: track.duration,
          album: track.album?.title || '',
          cover_art_hash: track.cover_art_hash
        })),
      })
    },
    // #endregion
    
    // #region Artist
    getTenArtists: async () => { // get 6 top played artists and another 4 random artists
      const artists_top = await idbHelper.getIndexedRange<IDBArtist>('artist', 'hit_count', null, true, 6)
      if(artists_top.length === 0) return resSucc([])
      const last = artists_top[artists_top.length - 1].hit_count || 0
      const artists_random = await idbHelper.getRandom<IDBArtist>('artist', 4, 'hit_count', keyRange.upperBound(last, true))
      const artists = artists_top.concat(artists_random)
      const result = artists.map((artist) => { 
        return {id: artist.id, name: artist.name, face_art_hash: artist.face_art_hash}
      })
      shuffle(result)
      return resSucc(result)
    },
    getArtistChars: async () => { 
      const chars: string[] = []
      for(let i = 0; i < 26; i++){
        chars.push(String.fromCharCode(65 + i))
      }
      chars.push('_')
      const start_chars = await idbHelper.getIndexDistinct<string>('artist', 'pinyin_initial')
      const result = chars.map((char) => {
        const charExists = start_chars.includes(char)
        return [char, charExists]
      })
      return resSucc(result)
    },
    getArtists: async (options?: IdbApiOptions) => { 
      const char = options?.pathParams?.char
      if (!char) return resError(400, 'Bad request')
      const range = keyRange.only(char)
      const result = await idbHelper.getIndexedRange<IDBArtist>('artist', 'pinyin_initial', range)
      return resSucc(result.map(artist => ({
        id: artist.id,
        name: artist.name,
        pinyin_initial: artist.pinyin_initial,
        face_art_hash: artist.face_art_hash
      })).sort(dynamicSort('name_lower')))
    },
    getArtist: async(options?: IdbApiOptions) => { 
      const id = options?.pathParams?.id
      if (!id) return resError(400, 'Bad request')
      const aid = parseInt(id)
      const artist = await idbHelper.get<IDBArtist>('artist', aid)
      const main_albums = await idbHelper.getIndexedRange<IDBAlbum>('album', 'album_artist_id', keyRange.only(aid))
      const main_album_ids = main_albums.map(album => album.id)
      const track_albums_all = await idbHelper.getIndexedRange<IDBAlbum>('album', 'artist_ids', keyRange.only(aid))
      const track_albums = track_albums_all.filter(album => !main_album_ids.includes(album.id))
      const main_albums_with_count = await Promise.all(main_albums.map(async item => ({
        id: item.id,
        title: item.title,
        cover_art_hash: item.cover_art_hash,
        track_count: await idbHelper.getCount('track', 'album_id', keyRange.only(item.id))
      })))
      const track_albums_with_count = await Promise.all(track_albums.map(async item => ({
        id: item.id,
        title: item.title,
        cover_art_hash: item.cover_art_hash,
        track_count: await idbHelper.getCount('track', 'album_id', keyRange.only(item.id))
      })))
      const tracks = await idbHelper.getIndexedAll<IDBTrack>('track', 'artist_ids', aid)
      const tracks_sorted = tracks.sort(dynamicSort('hit_count', 'desc'))
      const top_tracks = tracks_sorted.slice(0,20).map(track => ({
        id: track.id,
        title: track.title,
        artists: track.artists?.map(artist => artist.name),
        album: track.album?.title || '',
        duration: track.duration,
        cover_art_hash: track.cover_art_hash
      }))
      return resSucc({
        id,
        name: artist.name,
        pinyin_initial: artist.pinyin_initial,
        track_count: artist.track_count,
        face_art_hash: artist.face_art_hash,
        portrait_art_hash: artist.portrait_art_hash,
        main_albums: main_albums_with_count,
        track_albums: track_albums_with_count,
        top_tracks,
      })
    },
    getFavoritedArtists: async () => { 
      const range = keyRange.lowerBound('', true)
      const result = await idbHelper.getIndexedRange<IDBArtist>('artist', 'favorited_at', range, true, 30)
      return resSucc(result.map(artist => ({
        id: artist.id,
        name: artist.name,
        face_art_hash: artist.face_art_hash,
      })))
    },
    // #endregion

    // #region Folder
    getFolder: async (options?: IdbApiOptions) => { 
      const id = options?.pathParams?.id
      // if (!id) return resError(404, 'Folder not found')
      let fid: number
      if(!id) fid = 1
      else fid = parseInt(id)
      const curFolder = await idbHelper.get<IDBFolder>('folder', fid)
      // build ancestor chain from root(exclude self)
      const ancestors: {id: number, name: string}[] = []
      let pid = curFolder.parent_id
      while(pid) {
        const parent = await idbHelper.get<IDBFolder>('folder', pid)
        if(!parent) break
        ancestors.unshift({id: parent.id, name: parent.name})
        pid = parent.parent_id
      }
      const range = keyRange.bound([fid, ''], [fid, '\u{10FFFF}'], false, true)
      const folders = await idbHelper.getIndexedRange<IDBFolder>('folder', 'parent_child', range)
      const subfolders = await Promise.all(folders.map(async f => ({
        id: f.id,
        name: f.name,
        subfolder_count: await idbHelper.getCount('folder', 'parent_id', keyRange.only(f.id)),
        track_count: await idbHelper.getCount('track', 'folder_id', keyRange.only(f.id))
      })))
      const tracks_raw = await idbHelper.getIndexedRange<IDBTrack>('track', 'folder_id', keyRange.only(fid))
      const tracks = tracks_raw.sort(dynamicSort('title_lower'))
      return resSucc({
        id: curFolder.id,
        name: curFolder.name,
        ancestors,
        subfolders,
        tracks: tracks.map(t => ({
          id: t.id,
          title: t.title,
          artists: t.artists?.map(a => (a.name)),
          duration: t.duration,
          album: t.album?.title || '',
          cover_art_hash: t.cover_art_hash
        }))
      })
    },
    // #endregion

    // #region Genre
    getRandomGenres: async () => { 
      const result = await idbHelper.getRandom<IDBGenre>('genre', 8)
      return resSucc(result)
    },
    getGenres: async () => { 
      const genres = await idbHelper.getAll<IDBGenre>('genre')
      const result = await Promise.all(genres.map(async genre => ({
        ...genre,
        track_count: await idbHelper.getCount('track', 'genre_ids', keyRange.only(genre.id))
      })))
      return resSucc(result)
    },
    getGenre: async (options?: IdbApiOptions) => {
      const id = options?.pathParams?.id
      if (!id) return resError(400, 'Bad request')
      const gid = parseInt(id)
      const genre = await idbHelper.get<IDBGenre>('genre', gid)
      const track_count = await idbHelper.getCount('track', 'genre_ids', keyRange.only(gid))
      return resSucc({...genre, track_count})
    },
    getGenreTracks: async (options?: IdbApiOptions) => { 
      const id = options?.pathParams?.id
      if (!id) return resError(400, 'Bad request')
      const gid = parseInt(id)
      const page_size_str = options?.queryParams?.page_size
      const page_size = page_size_str ? parseInt(page_size_str) : 50
      const last_key = options?.queryParams?.last_key
      let range: IDBKeyRange
      if(last_key) {
        range = keyRange.bound([gid, decodeURIComponent(last_key)], [gid, '\uffff'], true, true)
      } else {
        range = keyRange.bound([gid, ''], [gid, '\uffff'], false, true)
      }
      const res = await idbHelper.getIndexedPaginated<IDBTrack>('track', 'genre_titles', 'title', range, page_size)
      const total = await idbHelper.getCount('track', 'genre_ids', keyRange.only(gid))
      return resSucc({
        total, 
        tracks: res.tracks.map((track) => { 
          return {
            id: track.id, 
            title: track.title, 
            artists: track.artists?.map(artist => artist.name), 
            duration: track.duration,
            album: track.album?.title || '',
            cover_art_hash: track.cover_art_hash
          }
        }),
        next_key: res.nextKey
      })
    },
    // #endregion

    // #region Playlist
    getTopPlaylists: async () => {
      const playlists =  await idbHelper.getIndexedRange<IDBPlaylist>('playlist', 'hit_count', null, true, 5)
      const result = playlists.map((playlist) => {
        return {id: playlist.id, title: playlist.title, cover_art_hash: playlist.cover_art_hash, track_count: playlist.track_ids.length}
      })
      return resSucc(result)
    },
    getPlaylists: async () => { 
      const playlists = await idbHelper.getAll<IDBPlaylist>('playlist')
      const result = playlists.map((playlist) => { 
        return {id: playlist.id, title: playlist.title, cover_art_hash: playlist.cover_art_hash, track_count: playlist.track_ids.length}
      })
      return resSucc(result)
    },
    getPlaylist: async (options?: IdbApiOptions) => { 
      const id = options?.pathParams?.id
      if (!id) return resError(400, 'Bad request')
      let pid: number | string
      if (isNumberic(id)) pid = parseInt(id)
      else pid = id
      const result = await idbHelper.get<IDBPlaylist>('playlist', pid)
      const tracks = await idbHelper.getIndexedIn<IDBTrack>('track', 'id', result.track_ids)
      return resSucc({
        id: result.id,
        title: result.title,
        comment: result.comment,
        created_at: result.created_at,
        cover_art_hash: result.cover_art_hash,
        tracks: tracks.map((track, index) => { 
          return {
            id: track.id, 
            title: track.title, 
            artists: track.artists?.map(artist => artist.name), 
            duration: track.duration,
            album: track.album?.title || '',
            cover_art_hash: track.cover_art_hash,
            position: index
          }
        })
      })
    },
    // #endregion

    // #region Track
    getTrack: async (options?: IdbApiOptions) => {
      const id = options?.pathParams?.id
      if (!id) return resError(400, 'Bad request')
      const tid = parseInt(id)
      const track = await idbHelper.get<IDBTrack>('track', tid)
      return resSucc({
        id: track.id,
        title: track.title,
        artists: track.artists,
        album: track.album,
        duration: track.duration,
        hit_count: track.hit_count,
        favorited_at: track.favorited_at,
        cover_art_hash: track.cover_art_hash,
      })
    },
    getRandomTracks: async (options?: IdbApiOptions) => { 
      const num = options?.queryParams?.num
      const count = num ? parseInt(num) : 50
      const tracks = await idbHelper.getRandom<IDBTrack>('track', count)
      const result = tracks.map((track) => { 
        return {
          id: track.id, 
          title: track.title, 
          artists: track.artists?.map(artist => artist.name), 
          duration: track.duration,
          album: track.album?.title || '',
          cover_art_hash: track.cover_art_hash
        }
      })
      return resSucc(result)
    },
    getArtistRandomTracks: async (options?: IdbApiOptions) => { 
      const artist_id = options?.queryParams?.artist_id
      const num = options?.queryParams?.num
      if (!artist_id || !num) return resError(400, 'Invalid params')
      const aid = parseInt(artist_id)
      const tracks_num = parseInt(num)
      const tracks = await idbHelper.getRandom<IDBTrack>('track', tracks_num, 'artist_ids', keyRange.only(aid))
      return resSucc(tracks.map(item => ({
        id: item.id, 
        title: item.title, 
        artists: item.artists?.map(artist => artist.name), 
        duration: item.duration,
        album: item.album?.title || '',
        cover_art_hash: item.cover_art_hash
      })))
    },
    getGenreRandomTracks: async (options?: IdbApiOptions) => { 
      const genre_id = options?.queryParams?.genre_id
      const num = options?.queryParams?.num
      if (!genre_id || !num) return resError(400, 'Invalid params')
      const gid = parseInt(genre_id)
      const tracks_num = parseInt(num)
      const tracks = await idbHelper.getRandom<IDBTrack>('track', tracks_num, 'genre_ids', keyRange.only(gid))
      return resSucc(tracks.map((track) => { 
        return {
          id: track.id, 
          title: track.title, 
          artists: track.artists?.map(artist => artist.name), 
          duration: track.duration,
          album: track.album?.title || '',
          cover_art_hash: track.cover_art_hash
        }
      }))
    },
    getFavoriteTracks: async () => { 
      const tracks = await idbHelper.getIndexedRange<IDBTrack>('track', 'favorited_at', keyRange.lowerBound('', true))
      return resSucc(tracks.map((track) => { 
        return {
          id: track.id, 
          title: track.title, 
          artists: track.artists?.map(artist => artist.name), 
          duration: track.duration,
          album: track.album?.title || '',
          cover_art_hash: track.cover_art_hash
        }
      }))
    },
    getFavoriteTrackIds: async () => {
      const tracks = await idbHelper.getIndexedRange<IDBTrack>('track', 'favorited_at', keyRange.lowerBound('', true))
      return resSucc(tracks.map((track) => { 
        return track.id
      }))
    },
    getLatestTracks: async () => { 
      const tracks = await idbHelper.getIndexedRange<IDBTrack>('track', 'updated_at', null, true, 12)
      const result = tracks.map((track) => { 
        return {
          id: track.id, 
          title: track.title, 
          artists: track.artists?.map(artist => artist.name), 
          duration: track.duration,
          album: track.album?.title || '',
          cover_art_hash: track.cover_art_hash
        }
      })
      return resSucc(result)
    },
    getMostPlayedTracks: async () => { 
      const tracks = await idbHelper.getIndexedRange<IDBTrack>('track', 'hit_count', null, true, 12)
      const result = tracks.map((track) => { 
        return {
          id: track.id, 
          title: track.title, 
          artists: track.artists?.map(artist => artist.name), 
          duration: track.duration,
          album: track.album?.title || '',
          cover_art_hash: track.cover_art_hash
        }
      })
      return resSucc(result)
    },
    // #endregion

    // #region Collection Tracks
    getCollectionTracks: async (options?: IdbApiOptions) => { 
      const id = options?.pathParams?.collection_id
      const ctype = options?.pathParams?.collection_type
      if (!id || !ctype) return resError(400, 'Bad request')
      const cid = parseInt(id)
      let tracks: IDBTrack[] = []
      switch(ctype) { 
        case 'album':
          tracks = await idbHelper.getIndexedRange<IDBTrack>('track', 'album_id', keyRange.only(cid))
          break
        case 'artist':
          tracks = await idbHelper.getIndexedRange<IDBTrack>('track', 'artist_ids', keyRange.only(cid))
          break
        case 'playlist':
          const playlist = await idbHelper.get<IDBPlaylist>('playlist', cid)
          tracks = await idbHelper.getIndexedIn<IDBTrack>('track', 'id', playlist.track_ids)
          break
      }
      return resSucc(tracks.map(item => ({ 
        id: item.id, 
        title: item.title, 
        artists: item.artists?.map(artist => artist.name), 
        duration: item.duration,
        album: item.album?.title || '',
        cover_art_hash: item.cover_art_hash
      }))) 
    },
    // #endregion

    // #region Search
    search: async (options?: IdbApiOptions) => { 
      const cat = options?.queryParams?.cat
      const kw = options?.queryParams?.kw
      const page_str = options?.queryParams?.page
      const page = parseInt(page_str || '1')
      const page_size_str = options?.queryParams?.page_size
      const pageSize = parseInt(page_size_str || '20')
      const cursor = options?.queryParams?.cursor
      let range: IDBKeyRange
      if(!kw) return resSucc({total: 0, data: []})
      if(cursor && page > 1) {
        range = keyRange.bound(decodeURIComponent(cursor), '\uffff', true, true)
      } else {
        range = keyRange.bound('', '\uffff', true, true)
      }
      switch(cat) { 
        case 'track':
          let resultTracks = await idbHelper.search<IDBTrack>('track', 'title_lower', 'title_lower', range, kw, page, pageSize)
          return resSucc({
            total: resultTracks.total, 
            data: resultTracks.data.map(track => ({
              id: track.id, 
              title: track.title, 
              artists: track.artists?.map(artist => artist.name), 
              duration: track.duration,
              album: track.album?.title || '',
              cover_art_hash: track.cover_art_hash
            })),
            next_key: resultTracks.nextKey
          })
        case 'artist':
          let resultArtist = await idbHelper.search<IDBArtist>('artist', 'name_lower', 'name_lower', range, kw, page, pageSize)
          return resSucc({
            total: resultArtist.total,
            data: resultArtist.data.map(artist => ({id: artist.id, name: artist.name, face_art_hash: artist.face_art_hash})),
            next_key: resultArtist.nextKey
          })
        case 'album':
          let resultAlbum = await idbHelper.search<IDBAlbum>('album', 'title_lower', 'title_lower', range, kw, page, pageSize)
          return resSucc({
            total: resultAlbum.total,
            data: resultAlbum.data.map(album => ({id: album.id, name: album.title, cover_art_hash: album.cover_art_hash})),
            next_key: resultAlbum.nextKey
          })
        default:
          return resSucc({
            total: 0
          })
      }
    },
    searchLibrary: async (options?: IdbApiOptions) => {
      const kw = options?.queryParams?.kw
      const limit_str = options?.queryParams?.limit
      const limit = limit_str ? parseInt(limit_str) : 50
      if(!kw) return resSucc({tracks: [], artists: [], albums: []})
      const range = keyRange.bound('', '\uffff', true, true)
      const [resultTracks, resultArtists, resultAlbums] = await Promise.all([
        idbHelper.search<IDBTrack>('track', 'title_lower', 'title_lower', range, kw, 1, limit),
        idbHelper.search<IDBArtist>('artist', 'name_lower', 'name_lower', range, kw, 1, limit),
        idbHelper.search<IDBAlbum>('album', 'title_lower', 'title_lower', range, kw, 1, limit),
      ])
      const albums = await Promise.all(resultAlbums.data.map(async album => ({
        id: album.id,
        title: album.title,
        cover_art_hash: album.cover_art_hash,
        track_count: await idbHelper.getCount('track', 'album_id', keyRange.only(album.id))
      })))
      return resSucc({
        tracks: resultTracks.data.map(track => ({
          id: track.id,
          title: track.title,
          artists: track.artists?.map(artist => artist.name),
          duration: track.duration,
          album: track.album?.title || '',
          cover_art_hash: track.cover_art_hash
        })),
        artists: resultArtists.data.map(artist => ({
          id: artist.id,
          name: artist.name,
          face_art_hash: artist.face_art_hash
        })),
        albums,
      })
    },
    // #endregion

    // #region Advanced indexdb operations

    /**
     * Get tracks with random artists
     * numpa - number of tracks of each artists
     * num - total number
     */
    getRandomArtistTracks: async (options?: IdbApiOptions) => { 
      const num = options?.queryParams?.num
      const numpa = options?.queryParams?.numpa // number per artist
      const count = num ? parseInt(num) : 50
      const num_per_artist = numpa ? parseInt(numpa) : 2
      const func = async (count: number, num_per_artist: number): Promise<IDBTrack[]> => {
        return new Promise<IDBTrack[]>((resolve, reject) => {
          idbHelper.begin_transaction('track', 'readonly').then((tx) => { 
            // cache partial reservoir for each artist_id(at most num_per_artist tracks per artist_id)
            const artistSamples = new Map<string | number, IDBTrack[]>()

            const store = tx.objectStore('track')
            const req = store.openCursor()
            req.onsuccess = () => { 
              const cursor = req.result
              if(cursor) { 
                const track: IDBTrack = cursor.value
                const artistId = track.artist_ids ? track.artist_ids[0] : null

                // init reservoir for each artist_id
                if(artistId) { 
                  if(!artistSamples.has(artistId)) { 
                    artistSamples.set(artistId, [])
                  }
                  const reservoir = artistSamples.get(artistId)!

                  // maitain a counter for each artist_id reservoir(simulate data stream length)
                  const countKey = '_count'
                  let currentCount = (reservoir as any)[countKey] || reservoir.length

                  // reservoir sample logic, keep at most num_per_artist tracks per artist_id
                  if(reservoir.length < num_per_artist) { 
                    reservoir.push(track)
                  } else {
                    const rand = Math.random()
                    // determine whether to replace according to the probability num_per_artist / (currentCount + 1)
                    if(rand < num_per_artist / (currentCount + 1)) {
                      const replaceIndex = Math.floor(Math.random() * num_per_artist)
                      reservoir[replaceIndex] = track
                    }
                  }
                  // update the counter
                  (reservoir as any)[countKey] = currentCount + 1
                }
                cursor.continue()
              } else {
                // complete traverse, collect results, summary of each artist sample may be more than the count.
                const candidates: IDBTrack[] = []
                for (const tracks of artistSamples.values()) {
                  candidates.push(...tracks)
                }

                // if the total number is less than count, return directly, otherwise randomly select <count> songs from candidates
                if(candidates.length <= count) {
                  resolve(candidates)
                } else {
                  // continue using the reservoir sampling algorithm to select <count> songs from candidates
                  const finalReservior = candidates.slice(0, count)
                  for(let i = count; i < candidates.length; i++) {
                    const j = Math.floor(Math.random() * (i + 1))
                    if(j < count) {
                      finalReservior[j] = candidates[i]
                    }
                  }
                  resolve(finalReservior)
                }
              }
            }
            req.onerror = () => { 
              reject(req.error)
            }
          }).catch((err) => { 
            reject(err)
          })
        })
      }
      const result = await func(count, num_per_artist)
      return resSucc(result.map(item => ({
        id: item.id, 
        title: item.title, 
        artists: item.artists?.map(artist => artist.name), 
        duration: item.duration,
        album: item.album?.title || '',
        cover_art_hash: item.cover_art_hash
      })))
    },
    getRandomWeightedArtistTracks: async (options?: IdbApiOptions) => { 
      const num = options?.queryParams?.num
      const wr = options?.queryParams?.weight // weight rate
      const count = num ? parseInt(num) : 50
      const weightRate = wr ? parseInt(wr) : 2

      const func = async (count: number, weightRate: number): Promise<IDBTrack[]> => {
        return new Promise<IDBTrack[]>((resolve, reject) => {
          const artistSamples = new Map<string | number, IDBTrack>()
          idbHelper.begin_transaction(['artist', 'track'], 'readonly').then((tx) => { 
            const store = tx.objectStore('artist')
            const req = store.getAll()
            req.onsuccess = () => { 
              const artists = req.result as IDBArtist[]
              // select artists by weighted random
              const selectedArtists = topWeightedLnRandom<IDBArtist, 'track_count'>(artists, count, 'track_count', weightRate)
              const artistIds = selectedArtists.map(item => item.id)
              const store_track = tx.objectStore('track')
              const trackReq = store_track.openCursor()
              trackReq.onsuccess = () => {
                const cursor = trackReq.result
                if(cursor) { 
                  const track: IDBTrack = cursor.value
                  if(track.artist_ids && track.artist_ids.length !== 0) {
                    let aid = track.artist_ids[0]
                    if(artistIds.includes(aid)) {
                      if(!artistSamples.has(aid)){
                        artistSamples.set(aid, track)
                      } else {
                        const track_count = selectedArtists.find(a => a.id === aid)?.track_count || 1
                        const rand = Math.random()  * track_count
                        if(rand < 1) { 
                          artistSamples.set(aid, track)
                        }
                      }
                    }
                  }
                  cursor.continue()
                } else {
                  resolve(Array.from(artistSamples.values()))
                }
              }
              trackReq.onerror = () => { 
                reject(trackReq.error)
              }
            }
            req.onerror = () => { 
              reject(req.error)
            }
          }).catch((err) => { 
            reject(err)
          })
        })
      }
      
      const result = await func(count, weightRate)
      return resSucc(result.map(item => ({
        id: item.id, 
        title: item.title, 
        artists: item.artists?.map(artist => artist.name), 
        duration: item.duration,
        album: item.album?.title || '',
        cover_art_hash: item.cover_art_hash
      })))
    },
    getRandomHitsWeightedTracks: async (options?: IdbApiOptions) => { 
      const num = options?.queryParams?.num
      const wr = options?.queryParams?.weight // number per genre
      const count = num ? parseInt(num) : 50
      const weightRate = wr ? parseInt(wr) : 2

      const func = async (count: number, weightRate: number): Promise<IDBTrack[]> => { 
        return new Promise<IDBTrack[]>((resolve, reject) => { 
          idbHelper.begin_transaction('track', 'readonly').then((tx) => {
            const index = tx.objectStore('track').index('hit_count')
            const req = index.openCursor(null, 'prev')
            const reservoir: IDBTrack[] = []
            let total = 0
            req.onsuccess = () => { 
              const cursor = req.result
              if(cursor) { 
                const track: IDBTrack = cursor.value
                if(reservoir.length < count) { 
                  reservoir.push(track)
                } else { 
                  if(total == 0) {
                    resolve(reservoir)
                    return
                  }
                  const rand = Math.random()
                  if(rand < (track.hit_count || 1) / total / weightRate) { 
                    const replaceIndex = Math.floor(Math.random() * reservoir.length)
                    reservoir[replaceIndex] = track
                  }
                }
                total++
                cursor.continue()
              } else {
                resolve(reservoir)
              }
            }
            req.onerror = () => { 
              reject(req.error)
            }
          }).catch((err) => { 
            reject(err)
          })
        })
      }
      const result = await func(count, weightRate)
      return resSucc(result.map(item => ({
        id: item.id, 
        title: item.title, 
        artists: item.artists?.map(artist => artist.name), 
        duration: item.duration,
        album: item.album?.title || '',
        cover_art_hash: item.cover_art_hash
      })))
    },

    // #endregion
  }
  return idbApis
}