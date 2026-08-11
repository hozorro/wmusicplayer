import { getLibraryIdb } from "..";
import { mutateEntity, toPlayTrackFromIdb } from "./common";
import { playbackWriter } from "@/services/playback-data";
import { coverUrl } from "@/services/transform";
import type { IDBTrack, IDBArtist } from "../shapes/idb";
import type { PlayTrack } from "@/player/types";
import { favTrack } from "@/apis/methods/music";

/** 曲目收藏：事务读改写 + 显示双写。返回 null = 曲目不存在 */
export async function toggleTrackFav(trackId: number): Promise<{ ok: boolean; fav: boolean } | null> {
  const idb = await getLibraryIdb()
  const track = await idb.get<IDBTrack>("tracks", trackId)
  if (!track) return null
  const fav = !track.favorited_at   // 目标态（后端 API 需显示态，先读后写）

  const ok = await playbackWriter.write({
    key: `fav:track:${trackId}`,
    label: `收藏歌曲《${track.title}》`,
    opType: 'fav-track',
    payload: { id: trackId, is_favorited: fav },
    local: () => mutateEntity<IDBTrack>('tracks', trackId, t => {
      const next = { ...t }
      if (fav) next.favorited_at = new Date().toISOString()
      else delete next.favorited_at
      return next
    }),
    remote: () => favTrack(trackId, fav).send()
  })
  return { ok, fav }
}

/** 歌手收藏：事务读改写 + 显示双写。返回 null = 歌手不存在 */
export async function toggleArtistFav(artistId: number): Promise<{ ok: boolean; fav: boolean } | null> {
  const idb = await getLibraryIdb()
  const artist = await idb.get<IDBArtist>("artists", artistId)
  if (!artist) return null
  const fav = !artist.favorited_at   // 目标态（后端 API 需显示态，先读后写）

  const ok = await playbackWriter.write({
    key: `fav:artist:${artistId}`,
    label: `收藏歌手《${artist.name}》`,
    opType: 'fav-artist',
    payload: { id: artistId, is_favorited: fav },
    local: () => mutateEntity<IDBArtist>('artists', artistId, a => {
      const next = { ...a }
      if (fav) next.favorited_at = new Date().toISOString()
      else delete next.favorited_at
      return next
    }),
    remote: () => favTrack(artistId, fav)
  })
  return { ok, fav }
}

// —— 直读 ——
const favRange = () => IDBKeyRange.lowerBound('') // 索引只含 favorited_at 非空记录

export async function getFavTrackIds(): Promise<number[]> {
  const idb = await getLibraryIdb()
  return (await idb.getByIndex<IDBTrack>("tracks", "favorited_at", favRange())).map(t => t.id)
}

export async function getFavTracks(): Promise<PlayTrack[]> {
  const idb = await getLibraryIdb()
  return (await idb.getByIndex<IDBTrack>("tracks", "favorited_at", favRange())).map(toPlayTrackFromIdb)
}

export async function getFavArtists(): Promise<Artist[]> {
  const idb = await getLibraryIdb()
  return (await idb.getByIndex<IDBArtist>("artists", "favorited_at", favRange())).map(a => ({
    id: a.id,
    name: a.name,
    pinyin_initial: a.pinyin_initial,
    cover: coverUrl('artist', a.id, a.face_art_hash, 'face')
  }))
}
