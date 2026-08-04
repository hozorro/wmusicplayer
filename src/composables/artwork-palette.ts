import { ref, watch, type Ref } from 'vue'
import { FALLBACK_PALETTE, ambientGradient, quantize, type Palette } from '@/utilies/palette'

export interface AmbientLayer { id: number; css: string }

async function extractPalette(url: string): Promise<Palette> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const size = 32
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(img, 0, 0, size, size)
        resolve(quantize(ctx.getImageData(0, 0, size, size).data))
      } catch {
        resolve(FALLBACK_PALETTE)
      }
    }
    img.onerror = () => resolve(FALLBACK_PALETTE)
    img.src = url
  })
}

/** 
 * 封面氛围层供给：artwork 变化 -> 提取主色 -> 推入新层淡入，旧层淡出
 * 最多保留两层，交叉淡入 1000ms
 */
export function useArtworkPalette(artwork: Ref<string | undefined>) {
  const layers = ref<AmbientLayer[]>([])
  let seq = 0
  let activeUrl: string | undefined

  watch(artwork, async url => {
    if (!url || url === activeUrl) return 
    activeUrl = url
    const palette = await extractPalette(url)
    if (url !== activeUrl) return   // 竞态守卫：已切歌则丢弃过期结果
    layers.value = [{ id: ++seq, css: ambientGradient(palette) }, ...layers.value].slice(0, 2)
  }, { immediate: true })

  return { layers }
}
