/** 事务型读改写 */

import { getLibraryIdb } from "..";
import { toPlayTrack, coverUrl } from "@/services/transform";
import type { IDBTrack } from "../shapes/idb";
import type { PlayTrack } from "@/player/types";

/**
 * 单实体事务型读改写：get -> modify -> put 同一 readwrite事务
 * 并发写不丢失更新（fav 与 hit_count 同时落盘的竞态由此消解）
 * fn 返回 null = 放弃写入
 */

export async function mutateEntity<T extends {id: unknown}>(
  store: string,
  id: IDBValidKey,
  fn: (cur: T) => T | null
): Promise<void> {
  const idb = await getLibraryIdb();
  await idb.writeStores([store], tx => {
    const os = tx.objectStore(store);
    const req = os.get(id) as IDBRequest<T | undefined>
    req.onsuccess = () => {
      const cur = req.result
      if (!cur) return 
      const next = fn(cur)
      if (next) os.put(next)
    }
  })
}

/** IDBTrack -> PlayTrack 的统一出口 */
export const toPlayTrackFromIdb = (t: IDBTrack): PlayTrack => 
  toPlayTrack(t as never, {
    album: {
      id: t.album?.id,
      title: t.album?.title,
    },
    cover: coverUrl('track', t.id, t.cover_art_hash),
  })
