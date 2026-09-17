<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = defineProps<{
  modelValue?: string
  /** 裁剪框宽高比（宽 / 高），默认 1:1 */
  aspectRatio?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  'crop': [file: File]
}>()

const containerRef = ref<HTMLDivElement>()
const imageRef = ref<HTMLImageElement>()
const fileInput = ref<HTMLInputElement>()

const imageUrl = ref<string>()
const imageFile = ref<File | null>(null)
const scale = ref(1)
const minScale = ref(0.1)
const maxScale = ref(5)
const translateX = ref(0)
const translateY = ref(0)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const touchStartDistance = ref(0)
const touchStartScale = ref(1)

const containerSize = ref({ width: 0, height: 0 })

/** 裁剪框占容器短边的比例 */
const CROP_RATIO = 0.8
/** 导出图片的最大边长，避免极端缩放时产出超大画布 */
const MAX_OUTPUT = 4096

/**
 * 根据容器尺寸计算裁剪框。
 * 关键：显示用的裁剪框和导出用的裁剪区域必须来自同一个函数，
 * 否则两处一旦不一致，裁出来的内容就会和看到的框对不上。
 */
function computeCropBox(cw: number, ch: number) {
  if (!cw || !ch) return { width: 0, height: 0, left: 0, top: 0 }
  const base = Math.min(cw, ch) * CROP_RATIO
  const ar = props.aspectRatio && props.aspectRatio > 0 ? props.aspectRatio : 1
  const width = ar >= 1 ? base : base * ar
  const height = ar >= 1 ? base / ar : base
  return { width, height, left: (cw - width) / 2, top: (ch - height) / 2 }
}

const cropBox = computed(() =>
  computeCropBox(containerSize.value.width, containerSize.value.height)
)

const cropStyle = computed(() => ({
  width: `${cropBox.value.width}px`,
  height: `${cropBox.value.height}px`,
  left: `${cropBox.value.left}px`,
  top: `${cropBox.value.top}px`
}))

const imageStyle = computed(() => ({
  transform: `translate(-50%, -50%) translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  transformOrigin: 'center center'
}))

watch(() => props.modelValue, (val) => {
  if (val && val !== imageUrl.value) {
    imageUrl.value = val
  }
}, { immediate: true })

function triggerFileInput() {
  fileInput.value?.click()
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (imageUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(imageUrl.value)
  }
  imageFile.value = file
  imageUrl.value = URL.createObjectURL(file)
  emit('update:modelValue', imageUrl.value)
  resetTransform()
}

function resetTransform() {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

function measureContainer() {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  containerSize.value = { width: rect.width, height: rect.height }
}

/** 图片在 scale = 1 时的布局尺寸（offsetWidth/Height 不受 transform 影响） */
function baseSize() {
  const el = imageRef.value
  if (!el) return null
  const width = el.offsetWidth || el.naturalWidth
  const height = el.offsetHeight || el.naturalHeight
  if (!width || !height) return null
  return { width, height }
}

/** 让图片刚好铺满裁剪框所需的最小缩放（cover） */
function coverScale() {
  const base = baseSize()
  const { width: cropW, height: cropH } = cropBox.value
  if (!base || !cropW || !cropH) return 1
  return Math.max(cropW / base.width, cropH / base.height)
}

/** 限制位移，保证裁剪框始终被图片覆盖，不会裁出空白 */
function clampTranslate() {
  const base = baseSize()
  const { width: cropW, height: cropH } = cropBox.value
  if (!base || !cropW || !cropH) return
  const renderedW = base.width * scale.value
  const renderedH = base.height * scale.value
  const maxX = Math.max(0, (renderedW - cropW) / 2)
  const maxY = Math.max(0, (renderedH - cropH) / 2)
  translateX.value = Math.min(maxX, Math.max(-maxX, translateX.value))
  translateY.value = Math.min(maxY, Math.max(-maxY, translateY.value))
}

function applyScale(next: number) {
  scale.value = Math.min(maxScale.value, Math.max(minScale.value, next))
  clampTranslate()
}

function onImageLoad() {
  if (!imageRef.value || !containerRef.value) return
  measureContainer()
  // 确保布局完成后再计算适配
  requestAnimationFrame(() => {
    measureContainer()
    fitImage()
  })
}

/** 初始适配：缩放到「刚好铺满裁剪框」并居中 */
function fitImage() {
  if (!baseSize()) return
  minScale.value = coverScale()
  maxScale.value = Math.max(5, minScale.value * 4)
  scale.value = minScale.value
  translateX.value = 0
  translateY.value = 0
  clampTranslate()
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  // 用乘法步进，小缩放下不会一下跳一大截
  applyScale(e.deltaY > 0 ? scale.value / 1.1 : scale.value * 1.1)
}

function onMouseDown(e: MouseEvent) {
  isDragging.value = true
  dragStart.value = { x: e.clientX - translateX.value, y: e.clientY - translateY.value }
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  translateX.value = e.clientX - dragStart.value.x
  translateY.value = e.clientY - dragStart.value.y
  clampTranslate()
}

function onMouseUp() {
  isDragging.value = false
}

function getTouchDistance(touches: TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 1) {
    isDragging.value = true
    dragStart.value = {
      x: e.touches[0].clientX - translateX.value,
      y: e.touches[0].clientY - translateY.value
    }
  } else if (e.touches.length === 2) {
    touchStartDistance.value = getTouchDistance(e.touches)
    touchStartScale.value = scale.value
  }
}

function onTouchMove(e: TouchEvent) {
  e.preventDefault()
  if (e.touches.length === 1 && isDragging.value) {
    translateX.value = e.touches[0].clientX - dragStart.value.x
    translateY.value = e.touches[0].clientY - dragStart.value.y
    clampTranslate()
  } else if (e.touches.length === 2 && touchStartDistance.value) {
    const distance = getTouchDistance(e.touches)
    applyScale(touchStartScale.value * (distance / touchStartDistance.value))
  }
}

function onTouchEnd() {
  isDragging.value = false
}

async function cropImage(): Promise<File | null> {
  const img = imageRef.value
  const container = containerRef.value
  if (!img || !container) return null

  // 直接量取真实渲染矩形：它已经包含了 scale / translate / 居中偏移的全部效果，
  // 不需要再手工复算 transform，从根子上避免坐标推导出错。
  const imgRect = img.getBoundingClientRect()
  const contRect = container.getBoundingClientRect()
  if (!imgRect.width || !imgRect.height || !img.naturalWidth || !img.naturalHeight) return null

  // 裁剪框用「当前」容器尺寸重算，避免容器尺寸变化后与显示不一致
  const { width: cropW, height: cropH, left: cropLeft, top: cropTop } =
    computeCropBox(contRect.width, contRect.height)

  // 屏幕像素 -> 原图像素 的换算比例
  const ratioX = img.naturalWidth / imgRect.width
  const ratioY = img.naturalHeight / imgRect.height

  const sx = (contRect.left + cropLeft - imgRect.left) * ratioX
  const sy = (contRect.top + cropTop - imgRect.top) * ratioY
  const sw = cropW * ratioX
  const sh = cropH * ratioY

  // 按原图分辨率导出（不再降采样到裁剪框的 CSS 尺寸）
  const outW = Math.max(1, Math.round(sw))
  const outH = Math.max(1, Math.round(sh))
  const k = Math.min(1, MAX_OUTPUT / Math.max(outW, outH))

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(outW * k))
  canvas.height = Math.max(1, Math.round(outH * k))

  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const sourceType = imageFile.value?.type || 'image/png'
  // jpeg 不支持透明，先铺白底，避免图片外的区域变成黑块
  if (sourceType === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)

  const name = imageFile.value?.name || 'cropped.png'
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(null)
          return
        }
        resolve(new File([blob], name, { type: sourceType }))
      },
      sourceType,
      sourceType === 'image/jpeg' ? 0.92 : undefined
    )
  })
}

async function handleCrop() {
  const file = await cropImage()
  if (file) {
    emit('crop', file)
  }
}

let resizeObserver: ResizeObserver | undefined

onMounted(() => {
  measureContainer()
  if (containerRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      measureContainer()
      // 容器变大后图片可能盖不住裁剪框，补一次最小缩放
      if (scale.value < coverScale()) applyScale(coverScale())
      else clampTranslate()
    })
    resizeObserver.observe(containerRef.value)
  }
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  resizeObserver?.disconnect()
  if (imageUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(imageUrl.value)
  }
})

defineExpose({
  triggerFileInput,
  handleCrop
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      ref="containerRef"
      class="relative w-full overflow-hidden rounded-xl bg-secondary/50 ring-1 ring-white/10"
      style="aspect-ratio: 1; touch-action: none;"
      @wheel="onWheel"
      @mousedown="onMouseDown"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <img
        v-if="imageUrl"
        ref="imageRef"
        :src="imageUrl"
        alt=""
        class="absolute left-1/2 top-1/2 max-w-none"
        :style="imageStyle"
        @load="onImageLoad"
        draggable="false"
      />
      <div
        v-if="imageUrl"
        class="pointer-events-none absolute border-2 border-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
        :style="cropStyle"
      >
        <div class="absolute inset-0 border border-white/30" />
      </div>
      <div
        v-if="imageUrl"
        class="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-primary/80 px-3 py-1 text-xs text-fg-secondary"
      >
        {{ t('playlist.crop_tip') }}
      </div>
      <div
        v-if="!imageUrl"
        class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-fg-secondary"
      >
        <svg viewBox="0 0 24 24" class="h-12 w-12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
    </div>

    <div class="flex gap-2">
      <button
        class="flex-1 rounded-lg bg-secondary/50 px-4 py-2 text-sm text-fg-primary ring-1 ring-fg-primary/10 transition hover:bg-secondary/70 active:scale-95"
        @click="triggerFileInput"
      >
        {{ imageUrl ? t('common.change') : t('playlist.cover_tip') }}
      </button>
      <button
        v-if="imageUrl"
        class="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-fg-primary shadow-lg shadow-accent/20 transition hover:bg-accent/90 active:scale-95"
        @click="handleCrop"
      >
        {{ t('playlist.crop') }}
      </button>
    </div>

    <input
      ref="fileInput"
      type="file"
      class="hidden"
      accept="image/*"
      @change="onFileChange"
    />
  </div>
</template>
