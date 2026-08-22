import { storeToRefs } from "pinia";
import { getPlayerFacade } from "@/player/facade";

/** 纯队列面：只组织音乐的页面只用它 */
export function usePlayerQueue() {
  const f = getPlayerFacade();
  const { tracks, currentTrack, currentIndex, mode } = storeToRefs(f.queue)
  return {
    tracks, currentTrack, currentIndex, mode,
    add: f.playQueue.add, addMany: f.playQueue.addMany,
    insertNext: f.playQueue.insertNext,
    removeAt: f.playQueue.removeAt, move: f.playQueue.move,
    replace: f.playQueue.replace, clear: f.playQueue.clear,
    setMode: f.playQueue.setMode,
  }
}