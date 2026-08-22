/** 
 * 独立组合函数，只有歌词面板订阅 
 * 
 * 不并入 usePlayer 是刻意的：
 * - lines 的订阅者只应是歌词面板
 * - 任何误订阅都会让无关组件跟着换行节奏重渲染
 * - 隔离靠 API 形状来守护，不靠自觉
 */

import { getPlayerFacade } from "@/player/facade";

export function useLyrics() {
  const { lyrics } = getPlayerFacade()
  return {
    lines: lyrics.lines,
    currentLine: lyrics.currentLine,
    status: lyrics.status
  }
}
