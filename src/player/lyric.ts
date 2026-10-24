/** LRC 歌词：解析与定位（纯函数，可单测） */

export interface LyricWord {
  /** 秒，该字开始时间（已应用 offset） */
  time: number
  text: string
}

export interface LyricLine {
  /** 秒，已应用 offset 修正 */
  time: number
  text: string
  /** 逐字时间标签存在时填充；为空数组表示普通行 */
  words?: LyricWord[]
}

const TIME_TAG = /^\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/
const WORD_TAG = /<(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?>/g
const OFFSET_TAG = /\[offset:\s*([+-]?\d+)\s*\]/i

/** 检测一行是否含逐字时间标签 <mm:ss.xxx> */
const WORD_TAG_DETECT = /<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/

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

    // 逐字歌词：提取 <mm:ss.xxx> 标签
    // 格式：<time1>字1<time2>字2... 每个时间标签标记其后文本的开始时间
    let words: LyricWord[] | undefined
    if (WORD_TAG_DETECT.test(text)) {
      words = []
      WORD_TAG.lastIndex = 0
      // 收集所有标签位置与时间
      const tags: { index: number; end: number; time: number }[] = []
      let wm: RegExpExecArray | null
      while ((wm = WORD_TAG.exec(text)) != null) {
        const [, wmin, wsec, wfrac] = wm
        const wfracSec = wfrac ? Number(wfrac) / 10 ** wfrac.length : 0
        tags.push({
          index: wm.index,
          end: wm.index + wm[0].length,
          time: Number(wmin) * 60 + Number(wsec) + wfracSec - offsetSec,
        })
      }
      // 每个标签的文本 = 该标签结束 → 下一标签开始（或行尾）
      for (let i = 0; i < tags.length; i++) {
        const start = tags[i].end
        const stop = i + 1 < tags.length ? tags[i + 1].index : text.length
        const wtext = text.slice(start, stop)
        if (wtext) {
          words.push({ time: tags[i].time, text: wtext })
        }
      }
      // 纯文本（不含 < > 标签）
      WORD_TAG.lastIndex = 0
      const plainText = text.replace(WORD_TAG, '').trim()
      for (const t of times) out.push({ time: t - offsetSec, text: plainText, words })
    } else {
      for (const t of times) out.push({ time: t - offsetSec, text })
    }
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

/** 二分定位逐字：返回最后一条 time ≤ t 的字索引，无命中返回 -1 */
export function findWordIndex(words: readonly LyricWord[], t: number): number {
  let lo = 0
  let hi = words.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (words[mid].time <= t) { ans = mid; lo = mid + 1 }
    else hi = mid - 1
  }
  return ans
}
