import { toIDBAlbum, toIDBArtist, toIDBGenre, toIDBFolder, toIDBPlaylist, toIDBTrack } from "@/idb/derive";
import { generalAlova } from "..";
import type { syncDeleted } from "@/idb/shapes/raw";

const STORE_TRANSFORMS: Record<string, (items: any[]) => unknown[]> = {
  tracks: items => items.map(toIDBTrack),
  albums: items => items.map(toIDBAlbum),
  artists: items => items.map(toIDBArtist),
  genres: items => items.map(toIDBGenre),
  folders: items => items.map(toIDBFolder),
  playlists: items => items.map(toIDBPlaylist),
}

interface SyncSummary {
  counts: Record<string, number>,
  deleted?: syncDeleted
  serverTime: string
}

interface SyncPullRaw {
  items: unknown[];
  next_after_id: number | null;
}

export const getSyncSummary = (since: string | null) => {
  return generalAlova.Get<SyncSummary>("/music/sync/summary", { params: since ? { since } : {} });
}

export const getSyncPull = (since: string | null, store: string, afterId: number | null, size: number) => {
  let params: Record<string, any> = { store, after_id: afterId ?? 0, size }
  params = since ? { ...params, since } : params
  return generalAlova.Get("/music/sync/pull", { 
    params,
    transform: (raw: SyncPullRaw) => {
      return {
        items: STORE_TRANSFORMS[store]?.(raw.items) ?? raw.items,
        next_after_id: raw.next_after_id
      }
    }
  });
}
