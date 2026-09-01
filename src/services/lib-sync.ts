/**
 * 曲库同步引擎：纯拉取、分页 + 端点续传
 * 序关系铁律：drain 先行 -> 拉取
 * 就绪态联动 idb-state；时钟服务端权威；删除走墓碑
 * 
 * 断点不变量：SyncProgress.storeIndex 恒指“下一个待处理的 store”
 * afterId 为其游标（null = 从头）——续传零特判
 */
import { reactive } from "vue"
import { invalidateCache } from "alova"
import { sleep } from "@/utilies/general"
import { getLibraryIdb, getMeta, setMeta } from "@/idb"
import { getSyncPull, getSyncSummary } from "@/apis/methods/sync"
import { guardedRebuild, playbackSync } from "./playback-data"
import type { syncDeleted } from "@/idb/shapes/raw"
import { setIdbReady } from "./idb-state"


export const SYNC_STORES = ['tracks', 'artists', 'albums', 'genres', 'folders', 'playlists'] as const
export type SyncStore = (typeof SYNC_STORES)[number]

/** 常数 */
const SYNC_PAGE_SIZE = 500
const SYNC_PAGE_ATTEMPTS = 3
const SYNC_PAGE_BACKOFF = [1000, 3000, 9000]

/** 端点快照：每页成功后落 meta，中断后从这里续传 */
interface SyncProgress {
  since: string | null  // null = 全量
  storeIndex: number
  afterId: number | null
}

export interface BatchProgress {
  total: number     // 实体总数（count）
  batches: number   // ceil(total / SYNC_PAGE_SIZE)
  done: number      // 已完成页数
  received: number  // 已接收实体数
}

export const syncState = reactive({
  running: false,
  lastMode: null as 'full' | 'incremental' | null,
  lastSyncAt: null as string | null,
  currentStore: null as string | null,
  batches: null as Record<string, BatchProgress> | null,
  doneBatches: 0,
  totalBatches: 0,
})

let syncing = false

function notifyRebuilt() {
  window.dispatchEvent(new Event('library-rebuilt'))
}

async function fetchPage(since: string | null, store: string, afterId: number | null) {
  for (let i = 0; i < SYNC_PAGE_ATTEMPTS; i++) {
    try {
      return await getSyncPull(since, store, afterId, SYNC_PAGE_SIZE)
    } catch {
      if (i === SYNC_PAGE_ATTEMPTS - 1) throw new Error(`Sync page failed: ${store}`)
      await sleep(SYNC_PAGE_BACKOFF[i])
    }
  }
  throw new Error('unreachable')
}

async function applyDeleted(deleted: syncDeleted): Promise<void> {
  const idb = await getLibraryIdb()
  await idb.bulkDel('tracks', deleted.tracks)
  await idb.bulkDel('playlists', deleted.playlists)
  await idb.bulkDel('artists', deleted.artists ?? [])
  await idb.bulkDel('albums', deleted.albums ?? [])
  await idb.bulkDel('genres', deleted.genres ?? [])
  await idb.bulkDel('folders', deleted.folders ?? [])
}

function initBatchProgress(counts: Record<string, number>) {
  syncState.batches = Object.fromEntries(SYNC_STORES.map(s => {
    const total = counts[s] ?? 0
    return [s, { total, batches: Math.ceil(total / SYNC_PAGE_SIZE), done: 0, received: 0 }]
  }))
  syncState.totalBatches = Object.values(syncState.batches).reduce((sum, b) => sum + b.batches, 0)
  syncState.doneBatches = 0
}

function onBatch(store: string, received: number) {
  const b = syncState.batches?.[store]
  if (b) { b.done++; b.received += received }
  syncState.doneBatches++
}

async function runPaged(p: SyncProgress, counts: Record<string, number>): Promise<void> {
  const idb = await getLibraryIdb()
  // 中途恢复 = 持久化游标；全新启动 / store 边界恢复 = null（从头）——不变量保证零特判
  let afterId: number | null = p.afterId
  for (let sIdx = p.storeIndex; sIdx < SYNC_STORES.length; sIdx++) {
    const store = SYNC_STORES[sIdx]
    
    if ((counts[store] ?? 0) === 0) {   // 空 store 跳过（恢复时同样自然跳过）
      p.storeIndex = sIdx + 1
      p.afterId = null
      await setMeta('sync:progress', p)
      continue
    }

    for (;;) {
      const page = await fetchPage(p.since, store, afterId)
      await idb.bulkPut(store, page.items)  // derive 已在 alova transform 完成
      afterId = page.next_after_id
      onBatch(store, page.items.length)

      // 断点：中途 = 当前索引 + 游标；拉完 = 下一索引 + null（跨 store 续传不重拉）
      p.storeIndex = afterId === null ? sIdx + 1 : sIdx
      p.afterId = afterId
      await setMeta('sync:progress', p)
      if (afterId === null) break
    }
    afterId = null
  }
}

export async function syncLibrary(opts?: { forceFull?: boolean }): Promise<'full' | 'incremental' | 'failed' | 'skipped'> {
  if (syncing) return 'skipped'
  syncing = true
  syncState.running = true
  try {
    // drain 先行：防拉取携带后端旧 playback 字段覆盖未同步本地写
    await playbackSync.drain().catch(() => {})

    const persisted = opts?.forceFull ? undefined : await getMeta<SyncProgress>('sync:progress')
    const since  = persisted
      ? persisted.since
      : opts?.forceFull ? null : await getMeta<string>('sync:lastSyncAt')
    
    const progress: SyncProgress = persisted ?? { since: since ?? null, storeIndex: 0, afterId: null }
    if (!persisted && since === null) {
      const idb = await getLibraryIdb()
      for (const store of SYNC_STORES) await idb.clear(store)   // 全量清库只在崭新起点
    }
    
    const summary = await getSyncSummary(progress.since).send()
    if (progress.since !== null && summary.deleted) {
      await applyDeleted(summary.deleted) // 墓碑先于分页落地
    }
    initBatchProgress(summary.counts)

    await runPaged(progress, summary.counts)

    const idb = await getLibraryIdb()
    await setMeta('sync:lastSyncAt', summary.serverTime)
    await idb.del('meta', 'sync:progress')
    syncState.lastMode = progress.since === null ? 'full' : 'incremental'
    syncState.lastSyncAt = summary.serverTime
    syncState.currentStore = null
    setIdbReady(true)
    notifyRebuilt()
    return syncState.lastMode
  } catch {
    return 'failed'
  } finally {
    syncing = false
    syncState.running = false
    invalidateCache()
  }
}

/** 手动重建：pending 守卫 -> 重建窗口就绪关闭（SW透传） -> 全量 */
export function rebuildLibrary(): Promise<boolean> {
  return guardedRebuild(async () => {
    setIdbReady(false)
    await syncLibrary({ forceFull: true })
  })
}

/** 调度：启动 + 回前台（最小间隔节流） */
const MIN_INTERVAL = 5 * 60 * 1000
let lastRunAt = 0

export function initSyncScheduler(): void {
  void run()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void run()
  })

  async function run() {
    if (Date.now() - lastRunAt < MIN_INTERVAL) return
    lastRunAt = Date.now()
    try { await syncLibrary() } catch { /* ignore */ }
  }
}
