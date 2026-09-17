/**
 * 失败同步清单，独立objectStore 'pending_sync', keyPath = key
 * 关键：函数不可持久化——这里只存可序列化的操作描述（opType + payload）
 * 重放时经 OP_REGISTRY 重建请求。同 key 写入直接覆盖（put 语义）
 * fav 类操作天然合并为最后一次状态
 */
import type { PendingStore } from "@/idb/pending";
import type { PlaybackOpType } from "@/idb/pending";
import type { PlayerConfig } from "@/config/player-config";

/** 指数退避计算：base * 2^attempt，封顶 max */
function backoffDelay(attempt: number, base: number, max: number): number {
  return Math.min(base * Math.pow(2, attempt), max)
}

export function createPlaybackSync(
  deps: {
    pending: PendingStore
    notify: (msg: string) => void
  },
  config: Pick<PlayerConfig, 'PLAYBACK_SYNC_MAX_ATTEMPTS' | 'BACKOFF_BASE_MS' | 'BACKOFF_MAX_MS'>,
) {
  const { PLAYBACK_SYNC_MAX_ATTEMPTS, BACKOFF_BASE_MS, BACKOFF_MAX_MS } = config

  const handlers = new Map<PlaybackOpType, (payload: any) => Promise<unknown>>()
  const registerHandler = (type: PlaybackOpType, fn: (payload: any) => Promise<unknown>) => {
    handlers.set(type, fn)
  }

  /** 即时充实 N 次：全败 -> 落 pending + 提醒。返回是否同步成功 */
  async function push(spec: {
    key: string; 
    opType: PlaybackOpType;
    payload: Record<string, unknown>;   // 操作载荷，用于drain时OP_REGISTRY的执行参数
    label: string;
    remote: () => Promise<unknown>
  }): Promise<boolean> {
    for (let i = 0; i < PLAYBACK_SYNC_MAX_ATTEMPTS; i++) {
      try { await spec.remote(); return true }
      catch { await sleep(backoffDelay(i, BACKOFF_BASE_MS, BACKOFF_MAX_MS)) }
    }
    await deps.pending.add({
      key: spec.key, opType: spec.opType, payload: spec.payload, label: spec.label,
      attempts: PLAYBACK_SYNC_MAX_ATTEMPTS, failedAt: Date.now()
    })
    deps.notify(`Failed to sync ${spec.label}, added to pending queue`)
    return false
  }

  /** 挽救时机：online 恢复 / rebuild 前。返回残留数 */
  async function drain(): Promise<number> {
    let remaining = 0
    const ops = await deps.pending.all()
    for (const op of ops) {
      const handler = handlers.get(op.opType)
      if (!handler) { remaining++; continue }
      try {
        await handler(op.payload)
        await deps.pending.remove(op.key)
      } catch {
        remaining++
      }
    }
    return remaining
  }

  async function discardAll() { await deps.pending.clear() }
  async function count() { return (await deps.pending.all()).length }

  async function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)) }

  return { push, drain, discardAll, count, registerHandler }
}

export type PlaybackSync = ReturnType<typeof createPlaybackSync>
