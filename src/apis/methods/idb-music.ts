import { v4 as uuidv4 } from "uuid";
import { keyRange } from "../idb-funcs";
import { shuffle, dynamicSort, topWeightedLnRandom } from "@/utilies/general";
import { indexedDbHelper } from "../idb-funcs";
import { getISOWithOffset } from "@/utilies/time-text";

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
  const idbApis = {
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
        track_count: tracks.length,
        tracks: tracks.map(track => ({id: track.id, title: track.title, artists: track.artists?.map(artist => artist.name)})),
      })
    },
    // #endregion
    
    // #region Artist
    getTenArtists: async () => { // get 6 top played artists and another 4 random artists
      const artists_top = await idbHelper.getIndexedRange<IDBArtist>('artist', 'hit_count', null, true, 6)
      const last = artists_top[artists_top.length - 1].hit_count
      const artists_random = await idbHelper.getRandom<IDBArtist>('artist', 4, 'hit_count', keyRange.upperBound(last, false))
      const artists = artists_top.concat(artists_random)
      const result = artists.map((artist) => { 
        return {id: artist.id, name: artist.name}
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
        pinyin_initial: artist.pinyin_initial
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
      const tracks = await idbHelper.getIndexedAll<IDBTrack>('track', 'artist_ids', aid)
      const tracks_sorted = tracks.sort(dynamicSort('hit_count', 'desc'))
      const top_tracks = tracks_sorted.slice(0,20).map(track => ({
        id: track.id,
        title: track.title,
        artists: track.artists?.map(artist => artist.name)
      }))
      return resSucc({
        id,
        name: artist.name,
        pinyin_initial: artist.pinyin_initial,
        track_count: artist.track_count,
        main_albums: main_albums.map(item => ({id: item.id, title: item.title})),
        track_albums: track_albums.map(item => ({id: item.id, title: item.title})),
        top_tracks,
      })
    },
    getFavoritedArtists: async () => { 
      const range = keyRange.lowerBound('', true)
      const result = await idbHelper.getIndexedRange<IDBArtist>('artist', 'favorited_at', range, true, 30)
      return resSucc(result.map(artist => ({
        id: artist.id,
        name: artist.name,
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
      const range = keyRange.bound([fid, ''], [fid, '\u{10FFFF}'], false, true)
      const folders = await idbHelper.getIndexedRange<IDBFolder>('folder', 'parent_child', range)
      const tracks_raw = await idbHelper.getIndexedRange<IDBTrack>('track', 'folder_id', keyRange.only(fid))
      const tracks = tracks_raw.sort(dynamicSort('title_lower'))
      return resSucc({
        id: curFolder.id,
        name: curFolder.name,
        parent_id: curFolder.id == 1 ? 0 :  curFolder.parent_id,
        children: folders.map(f => ({id: f.id, name: f.name})),
        tracks: tracks.map(t => ({id: t.id, title: t.title, artists: t.artists?.map(a => (a.name))}))
      })
    },
    // #endregion

    // #region Genre
    getRandomGenres: async () => { 
      const result = await idbHelper.getRandom<IDBGenre>('genre', 8)
      return resSucc(result)
    },
    getGenres: async () => { 
      return resSucc(await idbHelper.getAll<IDBGenre>('genre'))
    },
    getGenre: async (options?: IdbApiOptions) => {
      const id = options?.pathParams?.id
      if (!id) return resError(400, 'Bad request')
      const gid = parseInt(id)
      return resSucc(await idbHelper.get<IDBGenre>('genre', gid))
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
          return {id: track.id, title: track.title, artists: track.artists?.map(artist => artist.name)}
        }),
        next_key: res.nextKey
      })
    },
    // #endregion

    // #region Playlist
    getTopPlaylists: async () => {
      const playlists =  await idbHelper.getIndexedRange<IDBPlaylist>('playlist', 'hit_count', null, true, 5)
      const result = playlists.map((playlist) => {
        return {id: playlist.id, title: playlist.title}
      })
      return resSucc(result)
    },
    getPlaylists: async () => { 
      const playlists = await idbHelper.getAll<IDBPlaylist>('playlist')
      const result = playlists.map((playlist) => { 
        return {id: playlist.id, title: playlist.title}
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
        tracks: tracks.map((track) => { 
          return {id: track.id, title: track.title, artists: track.artists?.map(artist => artist.name)}
        })
      })
    },
    addNewPlaylist: async (options?: IdbApiOptions) => { 
      const title = options?.body?.title
      if(!title) return resError(400, 'Playlist title is required')
      const newPlaylist: IDBPlaylist = {
        id: 'tmp_' + uuidv4(),  // tmp_uuid for new playlist created and saved in frontend, treated when synced to backend
        title,
        cover: '',
        comment: '',
        track_ids: [],
        created_at: (new Date()).toISOString(),
        updated_at: (new Date()).toISOString(),
        hits: [],
        hit_count: 0
      }
      return resSucc(await idbHelper.add('playlist', newPlaylist))
    },
    addTrackToPlaylist: async (options?: IdbApiOptions) => {
      let pid = options?.body?.playlist_id
      let tid = options?.body?.track_id
      if(!pid || !tid) return resError(400, 'Invalid params')
      if (isNumberic(pid)) {
        pid = parseInt(pid)
      } 
      tid = parseInt(tid)
      const playlist = await idbHelper.get<IDBPlaylist>('playlist', pid)
      if(playlist.track_ids.includes(tid)) return resError(400, 'Track already in playlist')
      playlist.track_ids.push(tid)
      await idbHelper.update('playlist', pid, {track_ids: playlist.track_ids})
      return resSucc(true)
    },
    removeTrackFromPlaylist: async (options?: IdbApiOptions) => {
      let pid = options?.body?.playlist_id
      let tid = options?.body?.track_id
      if(!pid || !tid) return resError(400, 'Invalid params')
      if (isNumberic(pid)) {
        pid = parseInt(pid)
      } 
      tid = parseInt(tid)
      const playlist = await idbHelper.get<IDBPlaylist>('playlist', pid)
      playlist.track_ids = playlist.track_ids.filter(id => id !== tid)
      await idbHelper.update('playlist', pid, {track_ids: playlist.track_ids})
      return resSucc('ok')
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
      })
    },
    getRandomTracks: async (options?: IdbApiOptions) => { 
      const num = options?.queryParams?.num
      const count = num ? parseInt(num) : 50
      const tracks = await idbHelper.getRandom<IDBTrack>('track', count)
      const result = tracks.map((track) => { 
        return {id: track.id, title: track.title}
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
      return resSucc(tracks.map(item => ({id: item.id, title: item.title})))
    },
    getGenreRandomTracks: async (options?: IdbApiOptions) => { 
      const genre_id = options?.queryParams?.genre_id
      const num = options?.queryParams?.num
      if (!genre_id || !num) return resError(400, 'Invalid params')
      const gid = parseInt(genre_id)
      const tracks_num = parseInt(num)
      const tracks = await idbHelper.getRandom<IDBTrack>('track', tracks_num, 'genre_ids', keyRange.only(gid))
      return resSucc(tracks.map((track) => { 
        return {id: track.id, title: track.title}
      }))
    },
    getFavoriteTracks: async () => { 
      const tracks = await idbHelper.getIndexedRange<IDBTrack>('track', 'favorited_at', keyRange.lowerBound('', true))
      return resSucc(tracks.map((track) => { 
        return {id: track.id, title: track.title, artists: track.artists?.map(artist => artist.name)}
      }))
    },
    getLatestTracks: async () => { 
      const tracks = await idbHelper.getIndexedRange<IDBTrack>('track', 'updated_at', null, true, 12)
      const result = tracks.map((track) => { 
        return {id: track.id, title: track.title, artists: track.artists?.map(artist => artist.name)}
      })
      return resSucc(result)
    },
    getMostPlayedTracks: async () => { 
      const tracks = await idbHelper.getIndexedRange<IDBTrack>('track', 'hit_count', null, true, 12)
      const result = tracks.map((track) => { 
        return {id: track.id, title: track.title, artists: track.artists?.map(artist => artist.name)}
      })
      return resSucc(result)
    },
    favoriteTrack: async (options?: IdbApiOptions) => { 
      const track_id = options?.pathParams?.track_id
      const is_favorited = options?.body?.is_favorited
      if(!track_id || is_favorited == undefined) return resError(400, 'Invalid params')
      const id = parseInt(track_id)
      const track = await idbHelper.get<IDBTrack>('track', id)
      if(!track) return resError(404, 'Track not found')
      const favorited_at = is_favorited ? getISOWithOffset() : ''
      await idbHelper.update('track', id, {favorited_at})
      return resSucc(favorited_at)
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
      return resSucc(tracks.map(item => ({id: item.id, title: item.title}))) 
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
            data: resultTracks.data.map(track => ({id: track.id, title: track.title, artists: track.artists?.map(artist => artist.name)})), 
            next_key: resultTracks.nextKey
          })
        case 'artist':
          let resultArtist = await idbHelper.search<IDBArtist>('artist', 'name_lower', 'name_lower', range, kw, page, pageSize)
          return resSucc({
            total: resultArtist.total,
            data: resultArtist.data.map(artist => ({id: artist.id, name: artist.name})),
            next_key: resultArtist.nextKey
          })
        case 'album':
          let resultAlbum = await idbHelper.search<IDBAlbum>('album', 'title_lower', 'title_lower', range, kw, page, pageSize)
          return resSucc({
            total: resultAlbum.total,
            data: resultAlbum.data.map(album => ({id: album.id, name: album.title})),
            next_key: resultAlbum.nextKey
          })
        default:
          return resSucc({
            total: 0
          })
      }
    },
    // #endregion

    // #region Advanced indexdb operations

    /**
     * 获取随机歌手的歌曲，每个歌手的歌曲数为 numpa，总共返回不超过 num 首歌曲
     * @param param0 url参数 num: 总数，numpa: 每个歌手的歌曲数
     * @returns 
     */
    getRandomArtistTracks: async (options?: IdbApiOptions) => { 
      const num = options?.queryParams?.num
      const numpa = options?.queryParams?.numpa // number per artist
      const count = num ? parseInt(num) : 50
      const num_per_artist = numpa ? parseInt(numpa) : 2
      const func = async (count: number, num_per_artist: number): Promise<IDBTrack[]> => {
        return new Promise<IDBTrack[]>((resolve, reject) => {
          idbHelper.begin_transaction('track', 'readonly').then((tx) => { 
            // 缓存每个artist_id的局部蓄水池（最多num_per_artist首歌）
            const artistSamples = new Map<string | number, IDBTrack[]>()

            const store = tx.objectStore('track')
            const req = store.openCursor()
            req.onsuccess = () => { 
              const cursor = req.result
              if(cursor) { 
                const track: IDBTrack = cursor.value
                const artistId = track.artist_ids ? track.artist_ids[0] : null

                // 初始化每个artist_id的蓄水池
                if(artistId) { 
                  if(!artistSamples.has(artistId)) { 
                    artistSamples.set(artistId, [])
                  }
                  const reservoir = artistSamples.get(artistId)!

                  // 维护每个artist_id的蓄水池内部计数器（模拟数据流长度）
                  const countKey = '_count'
                  let currentCount = (reservoir as any)[countKey] || reservoir.length

                  // 蓄水池抽样逻辑，最多保留num_per_artist首歌
                  if(reservoir.length < num_per_artist) { 
                    reservoir.push(track)
                  } else {
                    const rand = Math.random()
                    // 概率 num_per_artist / (currentCount + 1) 决定是否被替换
                    if(rand < num_per_artist / (currentCount + 1)) {
                      const replaceIndex = Math.floor(Math.random() * num_per_artist)
                      reservoir[replaceIndex] = track
                    }
                  }
                  // 更新内部计数器
                  (reservoir as any)[countKey] = currentCount + 1
                }
                cursor.continue()
              } else {
                // 遍历结束，汇总结果, 有可能各个artist的样本数之和超过count
                const candidates: IDBTrack[] = []
                for (const tracks of artistSamples.values()) {
                  candidates.push(...tracks)
                }

                // 如果总数不超过count，直接返回，否则从candidates中随机抽取count首歌返回
                if(candidates.length <= count) {
                  resolve(candidates)
                } else {
                  // 继续使用水池抽样算法从candidates中抽取count首歌
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
      return resSucc(result.map(item => ({id: item.id, title: item.title})))
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
              // 按照加权随机算法选择若干歌手
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
      return resSucc(result.map(item => ({id: item.id, title: item.title})))
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
      return resSucc(result.map(item => ({id: item.id, title: item.title})))
    },

    // #endregion
  }
  return idbApis
}