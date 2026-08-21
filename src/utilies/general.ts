export function isNumberic(str: string) { 
  return /^\d+$/.test(str)
}

export function shuffle(arr: any[]){
  let i = arr.length
  while(i){
      let j = Math.floor(Math.random() * --i)
      let t = arr[j]
      arr[j] = arr[i]
      arr[i] = t
  }
}

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

export function topWeightedLnRandom<T extends Record<K,number>, K extends ('track_count' | 'hit_count')>(arr: T[], count: number, weightKey: K, weightRate: number) {
  let wr = 10 - weightRate
  if (wr < 2) wr = 2
  if (wr > 9) wr = 9
  const weights = arr.map(item  => {
    if(item[weightKey] <= 0) return 1
    return Math.log(item[weightKey]) / Math.log(wr)
  })

  const items = [...arr]
  const w = [...weights]
  const result: T[] = []

  for(let i = 0; i < count; i++) {
    const total = w.reduce((a, b) => a + b, 0)
    if(total === 0) break

    const r = Math.random() * total
    let sum = 0
    let j = 0
    for(; j < w.length; j++) {
      sum += w[j]
      if(sum >= r) break
    }
    if(j >= w.length) j = w.length - 1
    result.push(items[j])
    items.splice(j, 1)
    w.splice(j, 1)
  }
  return result
}

export function dynamicSort(property: string, order = 'asc') {
  var sortOrder = (order === 'asc') ? 1 : -1;
  return function(a: any, b: any) {
      var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
      return result * sortOrder;
  }
}

export function secToHMS(secs: number){
  let h = Math.floor(secs / 3600)
  let m = Math.floor((secs - h * 3600) / 60)
  let s = Math.floor(secs % 60)
  let fstr = m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0')
  if(h != 0){
      fstr = h.toString().padStart(2, '0') + ':' + fstr
  }
  return fstr
}

export function timeStampToDate(timestamp: number) {
  if (timestamp === 0) return '--'
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function getISOWithOffset(date = new Date()) {
  const pad = (num: number) => String(num).padStart(2, '0');
  const offset = date.getTimezoneOffset(); // minitues
  const absOffset = Math.abs(offset);
  const sign = offset > 0 ? '-' : '+';
  return [
    date.getFullYear(), '-', pad(date.getMonth() + 1), '-', pad(date.getDate()),
    'T', pad(date.getHours()), ':', pad(date.getMinutes()), ':', pad(date.getSeconds()),
    '.', String(date.getMilliseconds()).padStart(3, '0'),
    sign, pad(Math.floor(absOffset / 60)), ':', pad(absOffset % 60)
  ].join('');
}

export async function getImageAsDataURI(url: string) {
  const response = await fetch(url);
  const blob = await response.blob();

  const dataURI = new Promise<string | ArrayBuffer | null>(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

  return dataURI;
}

export const sleep = (ms: number): Promise<void> =>  new Promise(resolve => setTimeout(resolve, ms))

