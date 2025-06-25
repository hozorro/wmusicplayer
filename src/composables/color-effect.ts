import { type Ref, ref, onMounted, onUnmounted, nextTick } from 'vue'
import useColor from '@/utilies/img-color'

export const useColorEffect = (imgRef: Ref<HTMLImageElement | null>, errorDefaultSrc: string) => {
  const bgColor = ref('')
  const scrollOut = ref(false)
  const { analyseImageColor, convertDarkColor, createGradientBg } = useColor()

  let colorsArr: rgbColor[] = []
  let initBottom = 0
  let isHandled = false

  const handleImageLoad = async () => {
    const img = imgRef.value 
    if (!img || isHandled) return
    isHandled = true

    const colors = await analyseImageColor(img)
    if (colors) {
      colorsArr = [colors['dominant'], colors['corners'][1], colors['center'], colors['corners'][3]]
      colorsArr = colorsArr.map(color=>convertDarkColor(color))
      bgColor.value = createGradientBg(colorsArr, [0, 65,100])
    }
  }

  const updateBgColor = () => {
      const el = imgRef.value
      if (!el || initBottom <= 0) return

      const rect = el.getBoundingClientRect()
      const ratio = rect.bottom / initBottom

      if (ratio < 0.8) {
        const opacity = Math.max(ratio - 0.2, 0)
        bgColor.value = createGradientBg(colorsArr, [0, 65,100], opacity)
        scrollOut.value = rect.bottom < 0
      } else {
        bgColor.value = createGradientBg(colorsArr, [0, 65,100])
        scrollOut.value = false
      }
    }
  const refresh = async () => {
    isHandled = false
    await nextTick()
    const img = imgRef.value
    if (!img) return

    img.removeEventListener('load', onLoad)
    img.removeEventListener('error', onError)

    img.addEventListener('load', onLoad)
    img.addEventListener('error', onError)

    if (img.complete && img.naturalWidth > 0) {
      handleImageLoad()
    }
  }
  const onLoad = () => {
    const img = imgRef.value
    if (!img) return
    if (img.naturalWidth > 0) {
      handleImageLoad()
    }
  }

  const onError = () => {
    const img = imgRef.value
    if (!img) return
    img.removeEventListener('load', onLoad)
    img.crossOrigin = 'anonymous'
    img.src = errorDefaultSrc
    img.addEventListener('load', onLoad, {once: true})
  }

  onMounted(() => {
    const img = imgRef.value
    if (!img) return

    const rect = img.getBoundingClientRect()
    initBottom = rect.bottom
    refresh()

    window.addEventListener('scroll', updateBgColor)
  })
  
  onUnmounted(() => { 
    const img = imgRef.value
    img?.removeEventListener('load', onLoad)
    img?.removeEventListener('error', onError)
    window.removeEventListener('scroll', updateBgColor)
  })

  return {
    bgColor,
    scrollOut,
    refresh
  }
}