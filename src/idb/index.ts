import { openIdb, createIdb, type Idb } from "./idb-lib";
import { schema } from "./schema";

/** 应用侧与 SW 侧各自持有本上下文的单例（不同执行上下文天然隔离） */
let idbPromise: Promise<Idb> | null = null;
export function getLibraryIdb(): Promise<Idb> {
  if (!idbPromise) idbPromise = openIdb(schema).then(createIdb);
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
