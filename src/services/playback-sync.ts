/**
 * 失败同步清单，独立objectStore 'pending_sync', keyPath = key
 * 关键：函数不可持久化——这里只存可序列化的操作描述（opType + payload）
 * 重放时经 OP_REGISTRY 重建请求。同 key 写入直接覆盖（put 语义）
 * fav 类操作天然合并为最后一次状态
 */
import type { PendingStore } from "@/apis/methods/idb-locals";
import { 
  favTrack,
  favArtist,
  updateTrackHit,
  updateArtistHit,
  updatePlaylistHit,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  movePlaylistTrack,
} from "@/apis/methods/music";

export const OP_REGISTRY: Record<PlaybackOpType, (p: any) => Promise<unknown>> = {
  'fav-track':              p => favTrack(p.id, p.is_favorited).send(),
  'fav-artist':             p => favArtist(p.id, p.is_favorited).send(),
  'hit-track':              p => updateTrackHit(p.id).send(),
  'hit-artist':             p => updateArtistHit(p.id).send(),
  'hit-playlist':           p => updatePlaylistHit(p.id).send(),
  'add-track-to-playlist':  p => addTrackToPlaylist(p.playlist_id, p.track_id).send(),
  'remove-track-from-playlist': p => removeTrackFromPlaylist(p.playlist_id, p.track_id).send(),
  'move-playlist-track':    p => movePlaylistTrack(p.playlist_id, p.track_id, p.target_id).send(),
};

const MAX_ATTEMPTS = 3;
const BACKOFF = [1000, 3000, 9000]

export function createPlaybackSync(deps: {
  pending: PendingStore
  notify: (msg:string) => void
}) {
  /** 即时充实 3 次：全败 -> 落 pending + 提醒。返回是否同步成功 */
  async function push(spec: {
    key: string; opType: PlaybackOpType;
    payload: Record<string, unknown>; label: string;
    remote: () => Promise<unknown>
  }): Promise<boolean> {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      try { await spec.remote(); return true }
      catch { await sleep(BACKOFF[i])}
    }
    await deps.pending.add({
      key: spec.key, opType: spec.opType, payload: spec.payload, label: spec.label,
      attempts: MAX_ATTEMPTS, failedAt: Date.now()
    })
    deps.notify(`Failed to sync ${spec.label}, added to pending queue`)
    return false
  }

  /** 挽救时机：online 恢复 / rebuild 前。返回残留数 */
  async function drain(): Promise<number> {
    let remaining = 0
    const ops = await deps.pending.all()
    for (const op of ops) {
      try {
        await OP_REGISTRY[op.opType](op.payload)
        await deps.pending.remove(op.key)
      } catch { remaining++ }
    }
    return remaining
  }

  async function discardAll() { await deps.pending.clear() }
  async function count() { return (await deps.pending.all()).length }

  async function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)) }

  return { push, drain, discardAll, count }
}

export type PlaybackSync = ReturnType<typeof createPlaybackSync>
