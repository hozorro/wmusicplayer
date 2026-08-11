/** SW 侧就绪门禁：懒查询 meta + 内存缓存，BroadcastChannel 通知 */
import { getLibraryIdb } from "@/idb";

let readCache: boolean | null = null

const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('idb-ready') : null
if (channel) channel.onmessage = e => { readCache = !!e.data }

export async function idbReadyForSw(): Promise<boolean> {
  if (readCache !== null) return readCache
  try {
    readCache = !!(await (await getLibraryIdb()).get('meta', 'sync:lastSyncAt'))
  } catch {
    readCache = false
  }
  return readCache
}
