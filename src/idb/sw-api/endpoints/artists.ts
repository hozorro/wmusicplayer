import { getLibraryIdb } from "@/idb";
import type { IDBArtist, IDBAlbum, IDBTrack } from "@/idb/shapes/idb";
import { MISS, json, type ApiHandler } from "../contract"
import { toRawArtist, toRawAlbum, toRawTrack, favRange } from "../shapes";
import { sample } from "@/utilies/general";

/** 常数 */
const TOP_COUNT = 6
const RANDOM_COUNT = 4
const TOP_TRACKS_COUNT = 20

export const idbGetTenArtists: ApiHandler = async () => {
  const idb = await getLibraryIdb()
  const artists = await idb.getAll<IDBArtist>('artists')
  if (!artists.length) return MISS
  const ranked = [...artists].sort((a, b) => (b.hit_count ?? 0) - (a.hit_count ?? 0))
  const top = ranked.slice(0, TOP_COUNT)
  const random = sample(ranked.slice(TOP_COUNT), RANDOM_COUNT)
  return json([...top, ...random].map(toRawArtist))
}

export const idbGetArtistChars: ApiHandler = async () => {
  const idb = await getLibraryIdb()
  const artists = await idb.getAll<IDBArtist>('artists')
  const present = new Set(artists.map(a => /^[A-Z]$/.test(a.pinyin_initial) ? a.pinyin_initial : '_'))
  return json('ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('').map(c => ([c, present.has(c)])))
}

export const idbGetArtists: ApiHandler = async ({ params }) => {
  const char = params.char
  if (!char) return MISS
  const idb = await getLibraryIdb()
  if (char === '_') {
    const all = await idb.getAll<IDBArtist>('artists')
    return json(all.filter(a => !/^[A-Z]$/.test(a.pinyin_initial)).map(toRawArtist))
  }
  return json((await idb.getByIndex<IDBArtist>('artists', 'pinyin_initial', char)).map(toRawArtist))
}

export const idbGetArtist: ApiHandler = async ({ params }) => {
  const id = Number(params.id)
  const idb = await getLibraryIdb()
  const artist = await idb.get<IDBArtist>('artists', id)
  if (!artist) return MISS
  const [mainAlbums, involvedAlbums, artistTracks] = await Promise.all([
    idb.getByIndex<IDBAlbum>('albums', 'album_artist_id', id),
    idb.getByIndex<IDBAlbum>('albums', 'artist_ids', id),
    idb.getByIndex<IDBTrack>('tracks', 'artist_ids', id),
  ])
  const mainIds = new Set(mainAlbums.map(a => a.id))
  // 对齐后端：有播放记录的曲目按 hit_count 降序；不足上限时从未播放曲目中随机补齐，尽可能填满
  const played = artistTracks
    .filter(t => (t.hit_count ?? 0) > 0)
    .sort((a, b) => (b.hit_count ?? 0) - (a.hit_count ?? 0))
  const topTracks = played.slice(0, TOP_TRACKS_COUNT)
  if (topTracks.length < TOP_TRACKS_COUNT) {
    const unplayed = artistTracks.filter(t => (t.hit_count ?? 0) === 0)
    topTracks.push(...sample(unplayed, TOP_TRACKS_COUNT - topTracks.length))
  }
  return json({
    ...toRawArtist(artist),
    main_albums: mainAlbums.map(toRawAlbum),
    track_albums: involvedAlbums.filter(a => !mainIds.has(a.id)).map(toRawAlbum),
    top_tracks: topTracks.map(toRawTrack),
  })
}

export const idbGetFavArtists: ApiHandler = async () => {
  const idb = await getLibraryIdb()
  return json((await idb.getByIndex<IDBArtist>('artists', 'favorited_at', favRange)).map(toRawArtist))
}
