import { getLibraryIdb } from "@/idb";
import type { IDBTrack, IDBPlaylist, IDBArtist, IDBAlbum } from "@/idb/shapes/idb";
import { MISS, json, type ApiHandler } from "../contract"
import { genreRange, favRange, toRawTrack, toRawArtist, toRawAlbum } from "../shapes";
import { sample, weightedSample } from "@/utilies/general";
import { normalize } from "@/idb/derive";
import { reqAsPromise } from "@/idb/idb-lib";
import type { PlayerConfig } from "@/config/player-config";

/** 配置注入点：由应用层初始化时设置 */
let idbConfig: Pick<PlayerConfig,
  'RANDOM_DEFAULT_NUM' | 'SCATTER_M_DEFAULT' | 'SCATTER_N_DEFAULT' |
  'SCATTER_M_CAP' | 'SCATTER_N_CAP' | 'SEARCH_TYPE_LIMIT'
> = {
  RANDOM_DEFAULT_NUM: 50,
  SCATTER_M_DEFAULT: 3,
  SCATTER_N_DEFAULT: 50,
  SCATTER_M_CAP: 20,
  SCATTER_N_CAP: 200,
  SEARCH_TYPE_LIMIT: 50,
}

/** 应用层调用：注入配置 */
export function setIdbTracksConfig(config: typeof idbConfig) {
  idbConfig = config
}


export const idbGetRandomTracks: ApiHandler = async ({ query }) => {
  const idb = await getLibraryIdb()
  const num = Number(query.get("num") || idbConfig.RANDOM_DEFAULT_NUM)
  const tracks = await idb.getRandom<IDBTrack>("tracks", num)
  return json(tracks.map(toRawTrack))
}

export const idbGetArtistRandomTracks: ApiHandler = async ({ query }) => {
  const idb = await getLibraryIdb()
  const num = Number(query.get("num") || idbConfig.RANDOM_DEFAULT_NUM)
  const artistId = Number(query.get("artist_id") || 0)
  if (!artistId) return MISS
  const tracks = await idb.getByIndex<IDBTrack>("tracks", "artist_ids", artistId)
  return json(sample(tracks, num).map(toRawTrack))
}

export const idbGetGenreRandomTracks: ApiHandler = async ({ query }) => {
  const idb = await getLibraryIdb()
  const num = Number(query.get("num") || idbConfig.RANDOM_DEFAULT_NUM)
  const genreId = Number(query.get("genre_id") || 0)
  if (!genreId) return MISS
  const tracks = await idb.getRandomByIndex<IDBTrack>("tracks", "genre_titles", genreRange(genreId), num)
  return json(tracks.map(toRawTrack))
}

export const idbFavoritedTracks: ApiHandler = async ({ query }) => {
  const num = Number(query.get("num") || idbConfig.RANDOM_DEFAULT_NUM)
  const idb = await getLibraryIdb()
  const tracks = await idb.getByIndex<IDBTrack>("tracks", "favorited_at", favRange)
  return json(tracks.slice(0, num).map(toRawTrack))
}

export const idbFavoritedTrackIds: ApiHandler = async ({ query }) => {
  const num = Number(query.get("num") || idbConfig.RANDOM_DEFAULT_NUM)
  const idb = await getLibraryIdb()
  const tracks = await idb.getByIndex<IDBTrack>("tracks", "favorited_at", favRange)
  return json(tracks.slice(0, num).map(t => t.id))
}

export const idbGetLatestTracks: ApiHandler = async () => {
  const idb = await getLibraryIdb()
  const rows = await idb.topByIndex<IDBTrack>('tracks', 'created_at', 16, { direction: 'prev' })
  return json(rows.map(toRawTrack))
}

export const idbGetHotTracks: ApiHandler = async () => {
  const idb = await getLibraryIdb()
  // hit_count = 0 表示从未播放，排在索引末尾，prev 方向取前 N 时自然被排除
  const rows = await idb.topByIndex<IDBTrack>('tracks', 'hit_count', 16, { direction: 'prev' })
  return json(rows.map(toRawTrack))
}

export const idbGetCollectionTracks: ApiHandler = async ({ params }) => {
  const cType = params.ctype
  const cId = Number(params.cid || 0)
  if (!['album', 'artists', 'playlist'].includes(cType) || !cId) return MISS
  const idb = await getLibraryIdb()
  switch (cType) {
    case 'album':
      return json((await idb.getByIndex<IDBTrack>("tracks", "album_id", cId)).map(toRawTrack))
    case 'artists':
      return json((await idb.getByIndex<IDBTrack>("tracks", "artist_ids", cId)).map(toRawTrack))
    case 'playlist':
      const playlist = await idb.get<IDBPlaylist>("playlists", cId)
      if (!playlist) return MISS
      const sortedTracks = [...playlist.tracks].sort((a, b) => a.position - b.position)
      // 单事务批量取曲目；库中已删除条目静默跳过
      const tracks = await idb.readStores(['tracks'], async tx => {
        const os = tx.objectStore('tracks')
        return (await Promise.all(sortedTracks.map(e => new Promise<IDBTrack | undefined>(res => {
          const r = os.get(e.id) as IDBRequest<IDBTrack | undefined>
          r.onsuccess = () => res(r.result)
          r.onerror = () => res(undefined)
        }))))
        .filter((t): t is IDBTrack => !!t)
      })
      return json((tracks as IDBTrack[]).map(toRawTrack))
    default: return MISS
  }
}

// # region random
const clampWeight = (v: number) => Math.min(9, Math.max(2, Number.isFinite(v) ? v : 5 ))
/** 2→0.25 弱偏向 · 5→1 线性 · 9→2 强偏向 */
const alpha = (w: number) => (w - 1) / 4

/** 
 * 随机歌手散布取歌：洗牌歌手序 -> 每位歌手随机取 ≤ m 首 -> 填满 n 即停
 * 约束：每位 ≤ m，总量 ≤ n，跨歌手去重（多歌手曲目防重复入选）
 */
export const idbGetRndArtistSctdTracks: ApiHandler = async ({ query }) => {
  const m = Math.min(idbConfig.SCATTER_M_CAP, Math.max(1, Number(query.get("numpa") || idbConfig.SCATTER_M_DEFAULT)))
  const nRaw = Number(query.get("num") || idbConfig.SCATTER_N_DEFAULT)
  const n = Math.min(idbConfig.SCATTER_N_CAP, Math.max(m + 1, nRaw))  // 强制 n > m

  const idb = await getLibraryIdb()
  const artists = await idb.getAll<IDBArtist>("artists")
  if (!artists.length) return MISS
  const order = sample(artists, artists.length) // 全量洗牌，随机歌手序

  const picked: IDBTrack[] = []
  const pickedIds = new Set<number>()

  // 单事务顺序游走：逐位歌手索引查询，填满即停
  await idb.readStores(['tracks'], async tx => {
    const idx = tx.objectStore('tracks').index('artist_ids')
    for (const artist of order) {
      if (picked.length >= n) break
      const list = await new Promise<IDBTrack[]>(res => {
        const r = idx.getAll(artist.id) as IDBRequest<IDBTrack[]>
        r.onsuccess = () => res(r.result)
        r.onerror = () => res([])
      })
      // 跨歌手去重：feat 曲目可能挂在多位歌手名下
      const candidates = list.filter(t => !pickedIds.has(t.id))
      if (!candidates.length) continue
      const take = sample(candidates, Math.min(m, n - picked.length))
      for (const t of take) pickedIds.add(t.id)
      picked.push(...take)
    }
  })
  return json(picked.map(toRawTrack))
}

/**
 * 加权随机 50 位歌手，每人一首歌
 * 权重 = track_count^α：α 越大越偏向曲库大的歌手
 */
export const idbGetWgtRndArtistTracks: ApiHandler = async ({ query }) => {
  const a = alpha(clampWeight(Number(query.get("weight") || 5)))
  const num = Number(query.get("num") || idbConfig.RANDOM_DEFAULT_NUM)
  const idb = await getLibraryIdb()
  const artists = await idb.getAll<IDBArtist>("artists")
  if (!artists.length) return MISS
  const picked = weightedSample(artists, x => (x.track_count || 1) ** a, num)

  // 每人随机一首：单事务并发索引查询
  const pairs = await idb.readStores(['tracks'], async tx => {
    const idx = tx.objectStore('tracks').index('artist_ids')
    return Promise.all(picked.map(artist => 
      reqAsPromise(idx.getAll(artist.id) as IDBRequest<IDBTrack[]>)
        .then(list => ({ artist, list}))
    ))
  })
  return json((pairs as { artist: IDBArtist, list: IDBTrack[] }[])
    .filter(p => p.list.length > 0)
    .map(p => ({
      artist: toRawArtist(p.artist),
      tracks: toRawTrack(p.list[Math.floor(Math.random() * p.list.length)])
    }))
  )
}

/**
 * 加权随机 50 首歌
 * 权重 = (1 + hit_count)^α：α 未播放恒为 1（永远有机会），越大越偏向热门歌曲
 */
export const idbGetWgtRndTracks: ApiHandler = async ({ query }) => {
  const a = alpha(clampWeight(Number(query.get("weight") || 5)))
  const num = Number(query.get("num") || idbConfig.RANDOM_DEFAULT_NUM)
  const idb = await getLibraryIdb()
  const tracks = await idb.getAll<IDBTrack>("tracks")
  if (!tracks.length) return MISS
  const picked = weightedSample(tracks, x => (1 + (x.hit_count ?? 0)) ** a, num)
  return json(picked.map(toRawTrack))
}

/**
 * 随机获取未播放过的 tracks：hit_count = 0 表示从未播放
 * 通过 hit_count 索引精确匹配 + 随机偏移采样，避免全量物化
 */
export const idbGetRndUnhitTracks: ApiHandler = async ({ query }) => {
  const num = Number(query.get("num") || idbConfig.RANDOM_DEFAULT_NUM)
  const idb = await getLibraryIdb()
  const tracks = await idb.getRandomByIndex<IDBTrack>("tracks", "hit_count", IDBKeyRange.only(0), num)
  if (!tracks.length) return MISS
  return json(tracks.map(toRawTrack))
}

// # endregion

export const idbGetTrack: ApiHandler = async ({ params }) => {
  const id = Number(params.id || 0)
  if (!id) return MISS
  const idb = await getLibraryIdb()
  const track = await idb.get<IDBTrack>("tracks", id)
  if (!track) return MISS
  return json(toRawTrack(track))
}

/** 曲目播放时间序列：ISO 时间戳数组，老→新（与后端 gettrackhits 契约一致） */
export const idbGetTrackHits: ApiHandler = async ({ params }) => {
  const id = Number(params.track_id || 0)
  if (!id) return MISS
  const idb = await getLibraryIdb()
  const track = await idb.get<IDBTrack>("tracks", id)
  if (!track) return MISS
  return json([...(track.hits ?? [])].sort())  // ISO8601 字典序 = 时间序，sort 兜底保证老→新
}

export const idbSearch: ApiHandler = async ({ query }) => {
  const kw = normalize(query.get('kw') ?? '')
  if (!kw) return json({ tracks: [], artists: [], albums: [] })
  const idb = await getLibraryIdb()
  const prefixRange = IDBKeyRange.bound(kw, kw + '\uffff')

  async function searchStore<T>(
    store: string,
    index: string, 
    lower: (r: T) => string,
    map: (r: T) => unknown,
  ) {
    // 前缀段：B 树范围取值（快路径）
    let hits = await idb.getByIndex<T>(store, index, prefixRange, idbConfig.SEARCH_TYPE_LIMIT)
    // 包含段：前缀段不足才全扫补足
    if (hits.length < idbConfig.SEARCH_TYPE_LIMIT) {
      const all = await idb.getAll<T>(store)
      const fill = all.filter(r => !lower(r).startsWith(kw) && lower(r).includes(kw))
      hits = [...hits, ...fill].slice(0, idbConfig.SEARCH_TYPE_LIMIT)
    }
    return hits.map(map)
  }

  const [tracks, artists, albums] = await Promise.all([
    searchStore<IDBTrack>('tracks', 'title_lower', t => t.title_lower, toRawTrack),
    searchStore<IDBArtist>('artists', 'name_lower', a => a.name_lower, toRawArtist),
    searchStore<IDBAlbum>('albums', 'title_lower', a => a.title_lower, toRawAlbum),
  ])
  return json({ tracks, artists, albums })
}
