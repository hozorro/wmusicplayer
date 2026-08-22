/** LRC 歌词：解析与定位（纯函数，可单测） */

export interface LyricLine {
  /** 秒，已应用 offset 修正 */
  time: number
  text: string
}

const TIME_TAG = /^\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/
const OFFSET_TAG = /\[offset:\s*([+-]?\d+)\s*\]/i

/**
 * 解析 LRC：
 * - 支持 [mm:ss]、[mm:ss.xx] 和 [mm:ss.xxx] 三种精度
 * - 支持一行多时间标签（[00:18.50][00:45.20重复句）
 * - [offset:±ms] 整体平移，正值 = 歌词提前显示（业界惯例）
 * - 元数据标签（[ti:] / [ar:] 等）与空行自然滤除
 */
export function parseLrc(lrc: string): LyricLine[] {
  const offsetMatch = OFFSET_TAG.exec(lrc)
  const offsetSec = offsetMatch ? Number(offsetMatch[1]) / 1000 : 0

  const out: LyricLine[] = []
  for (const rawLine of lrc.split(/\r?\n/)) {
    let rest = rawLine.trim()
    const times: number[] = []
    let m: RegExpExecArray | null
    while ((m = TIME_TAG.exec(rest)) != null) {
      const [, min, sec, frac] = m
      const fracSec = frac ? Number(frac) / 10 ** frac.length : 0
      times.push(Number(min) * 60 + Number(sec) + fracSec)
      rest = rest.slice(m[0].length)
    }
    if (times.length === 0) continue    // 元数据，无标签行
    const text = rest.trim()
    for (const t of times) out.push({ time: t - offsetSec, text })
  }
  out.sort((a, b) => a.time - b.time)
  return out
}

/** 二分定位：返回最后一条 time ≤ t 的行索引，无命中返回 -1 */
export function findLine(lines: readonly LyricLine[], t: number): number {
  let lo = 0
  let hi = lines.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (lines[mid].time <= t) { ans = mid; lo = mid + 1 }
    else hi = mid - 1
  }
  return ans
}
