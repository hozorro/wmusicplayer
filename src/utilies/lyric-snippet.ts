/**
 * 歌词搜索片段切分：后端返回 { text, highlights }，highlights 为 [start, end) 字符区间。
 * 这里把片段切成「普通段 / 命中段」序列，交由模板渲染高亮。
 */

export interface SnippetPart {
  text: string
  hit: boolean
}

export interface SnippetSpan {
  text: string
  highlights: readonly (readonly number[])[]
}

/** 切分歌词片段，越界区间会被裁剪，重叠/相邻区间会合并 */
export function snippetParts(snippet: SnippetSpan): SnippetPart[] {
  const { text } = snippet
  if (!text) return []

  const spans = snippet.highlights
    .map(([start, end]) => [
      Math.max(0, Math.min(start ?? 0, text.length)),
      Math.max(0, Math.min(end ?? 0, text.length)),
    ] as const)
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0])

  // 合并重叠或首尾相接的区间，避免同一段命中被切得支离破碎
  const merged: [number, number][] = []
  for (const [start, end] of spans) {
    const last = merged[merged.length - 1]
    if (last && start <= last[1]) last[1] = Math.max(last[1], end)
    else merged.push([start, end])
  }

  const parts: SnippetPart[] = []
  let cursor = 0
  for (const [start, end] of merged) {
    if (start > cursor) parts.push({ text: text.slice(cursor, start), hit: false })
    parts.push({ text: text.slice(start, end), hit: true })
    cursor = end
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), hit: false })
  return parts
}
