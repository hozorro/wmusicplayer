import { getLibraryIdb } from "@/idb";
import type { IDBPlaylist, IDBTrack } from "@/idb/shapes/idb";
import { MISS, json, type ApiHandler } from "../contract"
import { toRawTrack } from "../shapes";

export const idbGetPlaylists: ApiHandler = async () => {
  const idb = await getLibraryIdb()
  const rows = await idb.getAll<IDBPlaylist>("playlists")
  return json(rows
    .sort((a, b) => (b.hit_count ?? 0) - (a.hit_count ?? 0))
    .map(p => ({ id: p.id, title: p.title, cover_art_hash: p.cover_art_hash, track_count: p.tracks.length }))
  )
}

export const idbGetPlaylist: ApiHandler = async ({ params }) => {
  const id = Number(params.id)
  const idb = await getLibraryIdb()
  const playlist = await idb.get<IDBPlaylist>("playlists", id)
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
  return json({
    id: playlist.id,
    title: playlist.title,
    comment: playlist.comment,
    created_at: playlist.created_at,
    cover_art_hash: playlist.cover_art_hash,
    track_count: playlist.tracks.length,
    tracks: (tracks as IDBTrack[]).map(toRawTrack)
  })
}

export const idbGetTopPlaylists: ApiHandler = async ({ query }) => {
  const limit = Number(query.get('limit') ?? 10)
  const idb = await getLibraryIdb()
  const rows = await idb.getAll<IDBPlaylist>("playlists").then(rows => rows.slice(0, limit))
  return json(rows
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(p => ({ id: p.id, title: p.title, cover_art_hash: p.cover_art_hash, track_count: p.tracks.length }))
  )
}
