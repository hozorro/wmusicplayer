import { toast } from "./toast";
import { createPendingStore } from "@/idb/pending";
import { createPlaybackSync } from "./playback-sync";
import { createPlaybackWriter } from "./playback-writer";
import { t } from "@/utilies/use-i18n";
import { getConfig } from "@/config/config-provider";

const pendingStore = createPendingStore();
export { pendingStore }
export const playbackSync = createPlaybackSync(
  { pending: pendingStore, notify: toast },
  getConfig(),
);
export const playbackWriter = createPlaybackWriter(playbackSync);

/** 定期同步守卫：drain → 残留确认 → 丢弃 → 重建（A65/A67） */
export async function guardedRebuild(rebuild: () => Promise<void>): Promise<boolean> {
  const remaining = await playbackSync.drain()
  if (remaining > 0) {
    const ops = await pendingStore.all()
    const ok = window.confirm(
      `${t('player.confirm_playback_deprecated', { remaining, ops_list: ops.map(op => op.label).join('\n -') })}`,
    )
    if (!ok) return false          // 推迟本次重建，pending 保留待下次
    await playbackSync.discardAll() // 先清 pending 再重建，防残留重放
  }
  await rebuild()
  window.dispatchEvent(new Event('idb-rebuilt'))
  return true
}

// 联网自愈：恢复连接即重放 pending
window.addEventListener('online', () => {
  playbackSync.drain().then(n => {
    if (n === 0) toast(t('player.info_playback_sync_success'))
  })
})