/**
 * 系统级 IDB 就绪态
 * 单一实时来源 = meta 'sync:lastSyncAt' 存在性——不另立字段，杜绝漂移
 * BroadcastChannel 是加速器，meta 查询是兜底
 */
import { readonly, ref } from "vue";
import { getMeta } from "@/idb";

const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('idb-ready') : null
const _idbReady = ref(false)

/** UI / 功能门禁的消费面（只读） */
export const idbReady = readonly(_idbReady)

export async function initIdbState(): Promise<void> {
  _idbReady.value = !!(await getMeta<string>('sync:lastSyncAt'))
}

export function setIdbReady(v: boolean): void {
  if (_idbReady.value === v) return
  _idbReady.value = v
  channel?.postMessage(v)   // 通知 SW 及时更新缓存
}
