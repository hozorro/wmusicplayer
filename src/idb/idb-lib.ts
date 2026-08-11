import type { IdbSchema } from "./schema";

/**
 * 最小IndexedDB封装：生命周期 + 读写 + 游标分页
 * 纪律：
 * 1. schema 驱动建库；版本变化 = 清空重建
 * 2. withTx 内禁止 await 非 IDB 的 promise（事务会提前提交）
 * 3. bulkPut 分块，避免长事务阻塞主线程
 */
export function reqAsPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function openIdb(schema: IdbSchema): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(schema.dbName, schema.version)
    req.onupgradeneeded = e => {
      const db = req.result
      // 版本变化 = 全量重建：删除全部旧 store，按 schema 重建
      if (e.oldVersion > 0) {
        for (const name of Array.from(db.objectStoreNames)) {
          db.deleteObjectStore(name)
        }
      }
      for (const store of schema.stores) {
        const os = db.createObjectStore(store.name, { keyPath: store.keyPath })
        for (const idx of store.indexes ?? []) {
          os.createIndex(idx.name, idx.keyPath, idx.options)
        }
      }
    }
    req.onsuccess= () => {
      const db = req.result
      // 其他标签页升级版本时让位，避免 blocked
      db.onversionchange = () => db.close()
      resolve(db)
    }
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error(`IDB open blocked:${schema.dbName}`))
  })
}

export interface PageOptions { offset?: number, limit?: number }

export function createIdb(db: IDBDatabase) {
  function withTx<T>(
    stores: string[],
    mode: IDBTransactionMode,
    fn: (tx: IDBTransaction) => T | Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode)
      let result: T | Promise<T>
      let settled = false
      tx.oncomplete = () => { settled = true; resolve(result as Promise<T> | T as any) }
      tx.onerror = () => { if (!settled) { settled = true; reject(tx.error) } }
      tx.onabort = () => {
        if (!settled) { settled = true; reject(tx.error ?? new Error('IDB transaction aborted')) }
      }
      try { result = fn(tx) } catch (e) { settled = true; reject(e) }
    })
  }

  // —— 读 ——
  const get = <T>(store: string, key: IDBValidKey) => 
    withTx<T | undefined>([store], 'readonly', tx => 
      reqAsPromise(tx.objectStore(store).get(key) as IDBRequest<T | undefined>))

  const getAll =<T>(store: string, query: IDBValidKey | IDBKeyRange | null = null, limit?: number) => 
    withTx<T[]>([store], 'readonly', tx =>
      reqAsPromise(tx.objectStore(store).getAll(query, limit) as IDBRequest<T[]>)
    )

  const getByIndex = <T>(store: string, index: string, query: IDBValidKey | IDBKeyRange, limit?: number) => 
    withTx<T[]>([store], 'readonly', tx => 
      reqAsPromise(tx.objectStore(store).index(index).getAll(query, limit) as IDBRequest<T[]>))

  const getOneByIndex = <T>(store: string, index: string, query: IDBValidKey | IDBKeyRange) => 
    withTx<T | undefined>([store], 'readonly', tx => 
      reqAsPromise(tx.objectStore(store).index(index).get(query) as IDBRequest<T | undefined>))

  const count = (store: string, query: IDBValidKey | IDBKeyRange | undefined = undefined) =>
    withTx<number>([store], 'readonly', tx => reqAsPromise(tx.objectStore(store).count(query)))

  const countByIndex = (store: string, index: string, query: IDBValidKey | IDBKeyRange) =>
    withTx<number>([store], 'readonly', tx => reqAsPromise(tx.objectStore(store).index(index).count(query)))

  /**
   * 索引游标分页：genre_tracks 等场景的地基
   * 复合键 [genreId, titleLower] 天然实现“流派内按标题有序”
   */
  const pageByIndex = <T>(
    store: string,
    indexName: string,
    range: IDBKeyRange,
    { offset = 0, limit = 20 }: PageOptions = {}
  ) => 
    withTx<T[]>([store], 'readonly', tx => new Promise<T[]>((resolve, reject) => {
      const idx = tx.objectStore(store).index(indexName)
      const out: T[] = []
      let skipped = false
      const req = idx.openCursor(range)
      req.onsuccess = () => {
        const cursor = req.result
        if (!cursor) { resolve(out); return }
        if (!skipped && offset > 0) {
          skipped = true
          cursor.advance(offset)
          return
        }
        out.push(cursor.value as T)
        if (out.length >= limit) { resolve(out); return }
        cursor.continue()
      }
      req.onerror = () => reject(req.error)
    }))

  /** 偏移抽样：抽样比过半时退化为部分洗牌，避免拒绝采样退化 */
  function pickOffsets(total: number, take: number): number[] {
    if (take > total / 2) {
      const idx = Array.from({ length: total }, (_, i) => i)
      for (let i = 0; i < take; i++) {
        const j = i + Math.floor(Math.random() * (total - i))
        ;[idx[i], idx[j]] = [idx[j], idx[i]]
      }
      return idx.slice(0, take).sort((a, b) => a - b)
    }
    const seen = new Set<number>()
    while (seen.size < take) seen.add(Math.floor(Math.random() * total))
    return [...seen].sort((a, b) => a - b)
  }

  /**
   * 随机采样：count -> 随机偏移 -> 单次游标遍历点停靠 
   * 不物化全表，内存开销 ≈ 采样数（大 store 友好）
   */
  const getRandom = <T>(store: string, n: number): Promise<T[]> =>
    (async () => {
      if (n <= 0) return []
      const total = await count(store)
      if (total === 0) return []
      const take = Math.min(n, total)
      const offsets = pickOffsets(total, take)

      return withTx<T[]>([store], 'readonly', tx => new Promise<T[]>((resolve, reject) => {
        const req = tx.objectStore(store).openCursor()
        const out: T[] = []
        let i = 0     // 下一个待采集偏移序号
        let at = -1   // 当前游标序位
        req.onsuccess = () => {
          const cursor = req.result
          if (!cursor || i >= offsets.length) { resolve(out); return }
          if (at === -1) at = 0     // 首条记录 = 序位 0
          if (at < offsets[i]) { 
            const jump = offsets[i] - at
            at = offsets[i]
            cursor.advance(jump); 
            return 
          }
          out.push(cursor.value as T)   // at === offsets[i] 定点采集
          i++
          if (i >= offsets.length) { resolve(out); return }
          at++
          cursor.continue()
        }
        req.onerror = () => reject(req.error)
      }))
    })()

  /**
   * 索引范围内随机采样：countByIndex → 随机偏移 → 索引游标定点停靠。
   * 规模无关——几十与几千走同一路径（A84 修订）。
   */
  const getRandomByIndex = <T>(
    store: string,
    indexName: string,
    range: IDBKeyRange,
    n: number,
  ): Promise<T[]> =>
    (async () => {
      if (n <= 0) return []
      const total = await countByIndex(store, indexName, range)
      if (total === 0) return []
      const take = Math.min(n, total)
      const offsets = pickOffsets(total, take)

      return withTx<T[]>([store], 'readonly', tx => new Promise<T[]>((resolve, reject) => {
        const req = tx.objectStore(store).index(indexName).openCursor(range)
        const out: T[] = []
        let i = 0
        let at = -1
        req.onsuccess = () => {
          const cursor = req.result
          if (!cursor || i >= offsets.length) { resolve(out); return }
          if (at === -1) at = 0
          if (at < offsets[i]) {
            const jump = offsets[i] - at
            at = offsets[i]
            cursor.advance(jump)
            return
          }
          out.push(cursor.value as T)
          i++
          if (i >= offsets.length) { resolve(out); return }
          at++
          cursor.continue()
        }
        req.onerror = () => reject(req.error)
      }))
    })()

  /**
   * 索引有序取前 N：游标按 direction 遍历、提前终止。
   * 只物化所需记录——万级 store 取 16 条 = 16 次反序列化
   * 注意：索引键缺失（字段 undefined）的记录不入索引，天然被排除
   */
  const topByIndex = <T>(
    store: string,
    indexName: string,
    n: number,
    opts?: { direction?: IDBCursorDirection, range?: IDBKeyRange }
  ): Promise<T[]> => 
    withTx<T[]>([store], 'readonly', tx => new Promise<T[]>((resolve, reject) => {
      const req = tx.objectStore(store).index(indexName)
        .openCursor(opts?.range ?? null, opts?.direction ?? 'next')
      const out: T[] = []
      req.onsuccess = () => {
        const cursor = req.result
        if (!cursor || out.length >= n) { resolve(out); return }
        out.push(cursor.value as T)
        cursor.continue()
      }
      req.onerror = () => reject(req.error)
    }))

  // —— 写 ——
  const put = (store: string, value: unknown) =>
    withTx<void>([store], 'readwrite', tx => { tx.objectStore(store).put(value) })

  /** 分块批量写：单事务 chunkSize 条，块间让出事件循环 */
  async function bulkPut(store: string, values: unknown[], chunkSize = 200): Promise<void> {
    for (let i = 0; i < values.length; i += chunkSize) {
      const chunk = values.slice(i, i + chunkSize)
      await withTx<void>([store], 'readwrite', tx => {
        const os = tx.objectStore(store)
        for (const v of chunk) os.put(v)
      })
    }
  }

  const del = (store: string, key: IDBValidKey) =>
    withTx<void>([store], 'readwrite', tx => { tx.objectStore(store).delete(key) })

  const bulkDel = (store: string, keys: IDBValidKey[]) =>
    withTx<void>([store], 'readwrite', tx => { 
      const os = tx.objectStore(store)
      for (const key of keys) os.delete(key) 
    })

  const clear = (store: string) =>
    withTx<void>([store], 'readwrite', tx => { tx.objectStore(store).clear() })

  /** 跨 store 聚合的逃生门（sw-api 拼装用）：同一事务内多个读请求 */
  const readStores = (store: string[], fn: (tx: IDBTransaction) => unknown) =>
    withTx(store, 'readonly', fn)
  /** readwrite 事务：app-api 事务性读改写地基 */
  const writeStores = (store: string[], fn: (tx: IDBTransaction) => unknown) =>
    withTx(store, 'readwrite', fn)

  return {
    db, get, getAll, getByIndex, getOneByIndex, count, countByIndex, getRandom, getRandomByIndex, 
    pageByIndex, topByIndex, put, bulkPut, del, bulkDel, clear, readStores, writeStores
  }
}

export type Idb = ReturnType<typeof createIdb>


