import { getLibraryIdb } from "..";
import { mutateEntity, toPlayTrackFromIdb } from "./common";
import { playbackWriter } from "@/services/playback-data";
import { coverUrl } from "@/services/transform";
import type { IDBPlaylist, IDBTrack } from "../shapes/idb";
import { 
  addPlaylist, updatePlaylist as updatePlaylistApi,
  addTrackToPlaylist, removeTrackFromPlaylist, 
  movePlaylistTrack as movePlaylistTrackApi 
} from "@/apis/methods/music";
import { toIDBPlaylist } from "../derive";

export interface PlaylistFields { title: string, comment: string }

/** 创建：网络先行。低频操作，离线代价可接受 */
export async function createPlaylist(
  fields: PlaylistFields, 
  cover?: File | null
): Promise<{ ok: true; id: number } | { ok: false; reason: 'offline' | 'error'}> {
  if (!navigator.onLine) return { ok: false, reason: 'offline' }
  try {
    const form = new FormData()
    form.append('title', fields.title)
    form.append('comment', fields.comment)
    if (cover) form.append('cover', cover)
    const created = await addPlaylist(form).send()
    const idb = await getLibraryIdb()
    await idb.put('playlists', toIDBPlaylist({...created, tracks: []}))
    return { ok: true, id: created.id }
  } catch (e) {
    return { ok: false, reason: 'error' }
  }
}

export async function updatePlaylist(
  id: number,
  fields: PlaylistFields,
  cover?: File
): Promise<{ ok: true } | { ok: false; reason: 'offline' | 'error' | 'local error'}> {
  if (!navigator.onLine) return { ok: false, reason: 'offline' }
  try {
    const form = new FormData()
    form.append('id', String(id))
    for (const [k, v] of Object.entries(fields)) form.append(k, v)
    if (cover) form.append('cover', cover)
    const updated = await updatePlaylistApi(form).send()
    const idb = await getLibraryIdb()
    const playlist = await idb.get<IDBPlaylist>('playlists', id)
    if (!playlist) return { ok: false, reason: 'local error' }
    await idb.put('playlists', toIDBPlaylist({...updated, tracks: playlist.tracks}))
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: 'error' }
  }
}


export const addPlaylistTrack = (playlistId: number, trackId: number) => {
  playbackWriter.write({
    key: `playlist:${playlistId}:add:${trackId}`,
    label: `添加歌曲《${trackId}》到播放列表《${playlistId}》`,
    opType: 'add-track-to-playlist',
    payload: { playlistId, trackId },
    local: () => mutateEntity<IDBPlaylist>('playlists', playlistId, p => { 
      if (p.tracks.some(e => e.id === trackId)) return p
      const position = p.tracks.length ? Math.max(...p.tracks.map(e => e.position)) + 1 : 0
      return { ...p, tracks: [...p.tracks, { id: trackId, position }]}
    }),
    remote: () => addTrackToPlaylist(playlistId, trackId).send()
  })
}

export const removePlaylistTrack = (playlistId: number, trackId: number) => {
  playbackWriter.write({
    key: `playlist:${playlistId}:remove:${trackId}`,
    label: `从歌单 ${playlistId} 中移除歌曲 ${trackId}`,
    opType: 'remove-track-from-playlist',
    payload: { playlistId, trackId },
    local: () => mutateEntity<IDBPlaylist>('playlists', playlistId, p => { 
      return { ...p, tracks: p.tracks.filter(e => e.id !== trackId)}
    }),
    remote: () => removeTrackFromPlaylist(playlistId, trackId).send()
  })
}

export const movePlaylistTrack = (playlistId: number, trackId: number, newPosition: number) => {
  playbackWriter.write({
    key: `playlist:${playlistId}:move:${trackId}:${newPosition}`,
    label: `在歌单 ${playlistId} 中将歌曲 ${trackId} 移动到 ${newPosition}`,
    opType: 'move-playlist-track',
    payload: { playlistId, trackId, newPosition },
    local: () => mutateEntity<IDBPlaylist>('playlists', playlistId, p => { 
      const sorted = [...p.tracks].sort((a, b) => a.position - b.position)
      const from = sorted.findIndex(e => e.id === trackId)
      if (from === -1 || from === newPosition) return p
      const [entry] = sorted.splice(from, 1)
      sorted.splice(newPosition, 0, entry)
      return { ...p, tracks: sorted.map((e, i) => ({ id: e.id, position: i }))}
    }),
    remote: () => movePlaylistTrackApi(playlistId, trackId, newPosition).send()
  })
}

// —— 直读 ——
export async function getPlaylists() {
  const idb = await getLibraryIdb()
  return (await idb.getAll<IDBPlaylist>('playlists'))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(p => ({
      id: p.id,
      title: p.title,
      cover: coverUrl('playlist', p.id, p.cover_art_hash),
      track_count: p.tracks.length,
    }))
}

/** 详情：条目从 tracks store 水合；库中已删除曲目静默跳过 */
export async function getPlaylistDetail(playlistId: number) {
  const idb = await getLibraryIdb()
  const p = await idb.get<IDBPlaylist>('playlists', playlistId)
  if (!p) return null
  const sorted = [...p.tracks].sort((a, b) => a.position - b.position)
  const tracks = await idb.readStores(['tracks'], async tx => {
    const os = tx.objectStore('tracks')
    const rows = await Promise.all(
      sorted.map(e => new Promise<IDBTrack | undefined>(res => {
        const r = os.get(e.id) as IDBRequest<IDBTrack | undefined>
        r.onsuccess = () => res(r.result)
        r.onerror = () => res(undefined)
      }))
    )
    return rows
  })
  return {
    id: p.id,
    title: p.title,
    comment: p.comment,
    created_at: p.created_at,
    cover: coverUrl('playlist', p.id, p.cover_art_hash),
    track_count: p.tracks.length,
    tracks: (tracks as (IDBTrack | undefined)[]).filter((t): t is IDBTrack => !!t).map(toPlayTrackFromIdb)
  }
}
