
/** Fisher-Yates: 返回新数组，不改变原数组 */
export function shuffled<T>(input: readonly T[]): T[] {
  const a = [...input]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function sample<T>(arr: readonly T[], k: number): T[] {
  const a = [...arr]
  const n = Math.min(k, a.length)
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (a.length - i))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}

/** 
 * Efraimidis-Spirakis 加权不放回抽样：weight 越大入选概率越高
 * 键 u^(1/w) 取 top-k，单遍 O(N log k)，weight 必须为正
 */
export function weightedSample<T>(items: readonly T[], weight: (item: T) => number, k: number): T[] {
  const take = Math.min(k, items.length)
  if (take <= 0) return []
  const keyed = items.map(item => ({
    item,
    key: Math.random() ** (1 / Math.max(weight(item), 1e-9))
  }))
  keyed.sort((a, b) => b.key - a.key)
  return keyed.slice(0, take).map(x => x.item)
}

export function chunk<T>(list: T[], size: number):T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i+=size) out.push(list.slice(i, i+size))
  return out
}

export function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00'
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`
}

export const sleep = (ms: number): Promise<void> =>  new Promise(resolve => setTimeout(resolve, ms))

export function generateTraceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // 降级方案：手动拼接 UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}