/**
 * 播放数据双阶段写入：
 *   1. local 即时写 IDB（读取模型落地，UI 乐观的依据）——失败则返回 false，调用方回滚 UI
 *   2. remote 进 sync 重试管道——不阻塞交互，失败落 pending + 提醒
 * remote 省略 = 本地独走阶段（后端 API 未就位），不进 pending、不产生失败噪音。
 * 不做回滚（A67）：上行失败的写入由下次重建冲刷。
 */
import type { PlaybackSync } from "./playback-sync";
import type { PlaybackOpType } from "@/idb/pending";


export function createPlaybackWriter(sync: PlaybackSync) {
  async function write(spec: {
    key: string
    label: string
    opType: PlaybackOpType
    payload: Record<string, unknown>
    local: () => Promise<unknown>
    remote?: () => Promise<unknown>
  }): Promise<boolean> {
    try { await spec.local() } catch { return false }
    if (spec.remote) {
      sync.push({
        key: spec.key, opType: spec.opType, 
        payload: spec.payload, label: spec.label, remote: spec.remote
      })
    }
    return true
  }

  return { write }
}