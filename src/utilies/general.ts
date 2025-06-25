export const getAssetImg = (fileName: string) => {
  let src = new URL(`../assets/imgs/${fileName}`, import.meta.url).href
  return src
}

export function shuffle(arr: any[]){
  let i = arr.length
  while(i){
      let j = Math.floor(Math.random() * i--)
      let t = arr[j]
      arr[j] = arr[i]
      arr[i] = t
  }
}

export function secToHMS(secs: number){
  let h = Math.floor(secs / 3600)
  let m = Math.floor((secs - h * 60) / 60)
  let s = Math.floor(secs % 60)
  let fstr = m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0')
  if(h != 0){
      fstr = h.toString().padStart(2, '0') + ':' + fstr
  }
  return fstr
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