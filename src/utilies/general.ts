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

/**
 * check whether the JWT token has expired
 * @param token JWT string（format: header.payload.signature）
 * @returns true - expired，false - not expired
 */
export function isTokenExpired(token: string): boolean {
  if (!token) {
    return true;
  }

  try {
    // payload is the second part
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) {
      return true; // invalid token structure
    }

    // Base64Url decode（pad '=' and replace '-' and '_' with '+' and '/'）
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='))
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload) as { exp?: number };

    if (typeof payload.exp !== 'number') {
      return true; // no exp field，take as expired
    }

    // exp is UNIX timestamp (s), transform to milliseconds
    const expirationTime = payload.exp * 1000;
    const now = Date.now();

    return expirationTime < now;
  } catch (error) {
    // failed to parse token, take as expired
    return true;
  }
}