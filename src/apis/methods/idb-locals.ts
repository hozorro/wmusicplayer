import { useMusicStore } from "@/store/music";
import { indexedDbHelper, keyRange } from "../idb-funcs";
import { getISOWithOffset } from "@/utilies/general";

const getIdbHelper = () => {
  const store = useMusicStore()
  return store.idbHelper as indexedDbHelper
}

export const getArtistsByIds = async (ids: number[]): Promise<Pick<IDBArtist, 'id' | 'name' | 'favorited_at'>[]> => { 
  const idbHelper = getIdbHelper()
  const artists: IDBArtist[] = await idbHelper.getIndexedIn('artist', 'id', ids)
  return artists.map(artist => ({id: artist.id, name: artist.name, favorited_at: artist.favorited_at}))
}
export const getTrackHits = async (id: number): Promise<string[]> => { 
  const idbHelper = getIdbHelper()
  return new Promise((resolve, reject) => { 
    idbHelper.begin_transaction('track', 'readonly').then((tx: IDBTransaction) => {
      const req = tx.objectStore('track').get(id)
      req.onsuccess = () => { 
        const data = req.result
        if(data) { 
          resolve(data.hits || [])
        } else { 
          resolve([])
        }
      }
      req.onerror = () => reject(req.error)
    }).catch(reject)
  })
}
export const getFavs = async (playback: 'track' | 'artist'): Promise<FavData[]> => {
  const idbHelper = getIdbHelper()
  return new Promise((resolve, reject) => {
    const result: FavData[] = []
    const range = keyRange.lowerBound('', true)
    idbHelper.begin_transaction(playback, 'readonly').then((tx: IDBTransaction) => {
      const req = tx.objectStore(playback).index('favorited_at').openCursor(range)
      req.onsuccess = () => { 
        const cursor = req.result
        if(cursor) { 
          result.push({
            id: cursor.value.id, 
            favorited_at: cursor.value.favorited_at,
          })
          cursor.continue()
        } else {
          resolve(result)
        }
      }
      req.onerror = () => reject(req.error)
    }).catch(reject)
  })
}
export const getHits = async (playback: 'track' | 'playlist'): Promise<{id: number, hits: string[]}[]> => {
  const idbHelper = getIdbHelper()
  return new Promise((resolve, reject) => {
    const result: {id: number, hits: string[]}[] = [] 
    const range = keyRange.lowerBound([], true)
    idbHelper.begin_transaction(playback, 'readonly').then((tx: IDBTransaction) => {
      const req = tx.objectStore(playback).index('hits').openCursor(range)
      req.onsuccess = () => { 
        const cursor = req.result
        if(cursor) { 
          result.push({id: cursor.value.id, hits: cursor.value.hits})
          cursor.continue()
        } else {
          resolve(result)
        }
      }
      req.onerror = () => reject(req.error)
    }).catch(reject)
  })
}
export const getTotalHitsCount = async (playback: 'track' | 'artist' | 'playlist'): Promise<number> => { 
  const idbHelper = getIdbHelper()
  return new Promise((resolve, reject) => { 
    let total = 0
    const range = keyRange.lowerBound(0, true)
    idbHelper.begin_transaction(playback, 'readonly').then((tx: IDBTransaction) => { 
      const req = tx.objectStore(playback).index('hit_count').openCursor(range)
      req.onsuccess = () => { 
        const cursor = req.result
        if(cursor) { 
          total += cursor.value.hit_count
          cursor.continue()
        } else resolve(total)
      }
      req.onerror = () => reject(req.error)
    }).catch(reject)
  })
}

export const addTrackToPlaylist = async (playlist_id: number, track_id: number): Promise<boolean> => {
  const idbHelper = getIdbHelper()
  return new Promise(async (resolve) => {
    const playlist = await idbHelper.get<IDBPlaylist>('playlist', playlist_id)
    if (playlist.track_ids.includes(track_id)) resolve(false)
    playlist.track_ids.push(track_id)
    await idbHelper.update('playlist', playlist_id, {track_ids: playlist.track_ids})
    resolve(true)
  })
}

export const removeTrackFromPlaylist = async (playlist_id: number, track_id: number): Promise<boolean> => {
  const idbHelper = getIdbHelper()
  return new Promise(async (resolve) => {
    const playlist = await idbHelper.get<IDBPlaylist>('playlist', playlist_id)
    if (!playlist.track_ids.includes(track_id)) resolve(false)
    playlist.track_ids = playlist.track_ids.filter(id => id !== track_id)
    await idbHelper.update('playlist', playlist_id, {track_ids: playlist.track_ids})
    resolve(true)
  })
}
    
export const movePlaylistTrack = async (playlist_id: number, track_id: number, target_id: number) => {
  const idbHelper = getIdbHelper()
  return new Promise(async (resolve, reject) => {
    if (track_id === target_id) resolve(false)
    const playlist = await idbHelper.get<IDBPlaylist>('playlist', playlist_id)
    const track_ids = playlist.track_ids
    const srcIdx = track_ids.indexOf(track_id)
    track_ids.splice(srcIdx, 1)
    const tgtIdx = track_ids.indexOf(target_id)
    if(srcIdx === -1 || track_ids.indexOf(target_id) === -1) reject(new Error('Track not found in playlist'))
    track_ids.splice(tgtIdx, 0, track_id)
    await idbHelper.update('playlist', playlist_id, {track_ids})
    resolve(true)
  })
}

export const updateHits = async (hitType: 'playlist' | 'track' | 'artist', id: number | string) => { 
  const idbHelper = getIdbHelper()
  const func = async () => {
    return new Promise((resolve, reject) => { 
      idbHelper.begin_transaction(hitType, 'readwrite').then((tx: IDBTransaction) => {
        const store = tx.objectStore(hitType)
        const req = store.get(id)
        req.onsuccess = () => { 
          const data = req.result
          if(data) { 
            data.hits.push(getISOWithOffset())
            data.hit_count += 1
            store.put(data)
            resolve(data.hit_count)
          } else { 
            reject(new Error('Data not found'))
          }
        }
        req.onerror = () => reject(req.error)
      })
    })
  }
  await func()
}
export const updateFav = async (favType: 'track' | 'artist', id: number, isFavorited: boolean) => {
  const idbHelper = getIdbHelper()
  const func = async () => {
    return new Promise((resolve, reject) => { 
      idbHelper.begin_transaction(favType, 'readwrite').then((tx: IDBTransaction) => {
        const store = tx.objectStore(favType)
        const req = store.get(id)
        req.onsuccess = () => { 
          const data = req.result
          if(data) { 
            if (isFavorited) {
              data.favorited_at = getISOWithOffset()
            } else { 
              data.favorited_at = ''
            }
            store.put(data)
            resolve(data.favorited_at)
          } else {
            reject(new Error('Data not found'))
          }
        }
        req.onerror = () => reject(req.error)
      })
    })
  }
  await func()
}

export const updateArtistHitCount = async (id: number) => {
  const idbHelper = getIdbHelper()
  const func = async () => {
    return new Promise((resolve, reject) => { 
      idbHelper.begin_transaction('artist', 'readwrite').then((tx: IDBTransaction) => {
        const store = tx.objectStore('artist')
        const req = store.get(id)
        req.onsuccess = () => { 
          const data = req.result
          if(data) { 
            data.hit_count += 1
            store.put(data)
            resolve(data.hit_count)
          } else { 
            reject(new Error('Data not found'))
          }
        }
      })
    })
  }
  await func()
}

export const updateLocalMeta = async (name: Exclude<MetaType, 'play_data_version'>) => { 
  const idbHelper = getIdbHelper()
  const count = await idbHelper.getCount(name)
  await idbHelper.update('meta', name, {name, value: count.toString()})
}

export interface PendingStore {
  add(op: PendingOp): Promise<void>
  all(): Promise<PendingOp[]>
  remove(key: string): Promise<void>
  clear(): Promise<void>
}

export function createPendingStore(): PendingStore {
  const idbHelper = getIdbHelper()

  async function add(op: PendingOp): Promise<void> {
    await idbHelper.upsert('pending', op)
  }

  async function all(): Promise<PendingOp[]> {
    return idbHelper.getAll('pending')
  }

  async function remove(key: string): Promise<void> {
    await idbHelper.delete('pending', key)
  }

  async function clear(): Promise<void> {
    await idbHelper.clear('pending')
  }

  return { add, all, remove, clear }
}