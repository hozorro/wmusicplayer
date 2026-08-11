import { getLibraryIdb } from "@/idb"
import type { IDBTrack, IDBAlbum } from "@/idb/shapes/idb"
import { MISS, json, type RouteCtx } from "../contract"
import { toRawAlbum, toRawTrack } from "../shapes"

export async function idbGetAlbum({ params }: RouteCtx) {
  const idb = await getLibraryIdb()
  const album = await idb.get<IDBAlbum>("albums", Number(params.id))
  if (!album) return MISS
  const tracks = await idb.getByIndex<IDBTrack>("tracks", "album_id", album.id)
  return json({ ...toRawAlbum(album), tracks: tracks.map(toRawTrack)})
}

