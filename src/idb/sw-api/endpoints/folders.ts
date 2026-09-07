import { getLibraryIdb } from "@/idb";
import type { IDBFolder, IDBTrack } from "@/idb/shapes/idb";
import { MISS, json, type ApiHandler } from "../contract"
import { toRawTrack } from "../shapes";

export const idbGetFolder: ApiHandler = async ({ params }) => {
  const id = Number(params.id)
  const idb = await getLibraryIdb()
  const folder = await idb.get<IDBFolder>('folders', id)
  if (!folder) return MISS
  const [subfolders, tracks] = await Promise.all([
    idb.getByIndex<IDBFolder>('folders', 'parent_id', id),
    idb.getByIndex<IDBTrack>('tracks', 'folder_id', id),
  ])
  // 祖先链上溯（层级 ≤ 6，串行无碍）
  const ancestors:{ id: number, name: string }[] = []
  let cur = folder
  while (cur.parent_id !== null) {
    const parent = await idb.get<IDBFolder>('folders', cur.parent_id)
    if (!parent) break
    ancestors.unshift({ id: parent.id, name: parent.name })
    cur = parent
  }
  return json({ 
    ...folder, 
    ancestors, 
    subfolders: subfolders.sort((a, b) => a.name.localeCompare(b.name)), 
    tracks: tracks.sort((a, b) => a.title_lower.localeCompare(b.title_lower)).map(toRawTrack) 
  })
}
