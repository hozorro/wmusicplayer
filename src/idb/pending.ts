// pending_sync 独立IDB，idb-lib 实现
import { openIdb, createIdb, type Idb } from './idb-lib'
import type { IdbSchema } from './schema'

export type PlaybackOpType =
  | 'fav-track' | 'fav-artist'
  | 'hit-track' | 'hit-artist' | 'hit-playlist'
  | 'add-track-to-playlist' | 'remove-track-from-playlist' | 'move-playlist-track'

export interface PendingOp {
  key: string
  opType: PlaybackOpType
  payload: Record<string, unknown>
  label: string
  attempts: number
  failedAt: number
}
export interface PendingStore {
  add(op: PendingOp): Promise<void>
  all(): Promise<PendingOp[]>
  remove(key: string): Promise<void>
  clear(): Promise<void>
}

const pendingSchema: IdbSchema = {
  dbName: 'playback-sync-pending',
  version: 1,
  stores: [{ name: 'pending', keyPath: 'key' }],
}

let idbPromise: Promise<Idb> | null = null
function getPendingIdb(): Promise<Idb> {
  if (!idbPromise) idbPromise = openIdb(pendingSchema).then(createIdb)
  return idbPromise
}

export function createPendingStore(): PendingStore {
  return {
    async add(op) { await (await getPendingIdb()).put('pending', op) },
    async all() { return (await getPendingIdb()).getAll<PendingOp>('pending') },
    async remove(key) { await (await getPendingIdb()).del('pending', key) },
    async clear() { await (await getPendingIdb()).clear('pending') },
  }
}