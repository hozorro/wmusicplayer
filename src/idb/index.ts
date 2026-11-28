import { openIdb, createIdb, type Idb } from "./idb-lib";
import { schema } from "./schema";

/** 应用侧与 SW 侧各自持有本上下文的单例（不同执行上下文天然隔离） */
let idbPromise: Promise<Idb> | null = null;
let generation = 0;
export function getLibraryIdb(): Promise<Idb> {
  if (idbPromise) return idbPromise;
  const current = ++generation;
  // 版本升级时旧连接会被 onversionchange 关闭；丢弃单例，下次调用重开新版本库
  idbPromise = openIdb(schema, () => {
    if (generation === current) idbPromise = null;
  }).then(createIdb);
  return idbPromise;
}

export interface MetaEntry { key: string; value: unknown; updatedAt: string }

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const idb = await getLibraryIdb();
  const entry = await idb.get<MetaEntry>("meta", key);
  return entry?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const idb = await getLibraryIdb();
  await idb.put("meta", { key, value, updatedAt: new Date().toISOString() });
}
