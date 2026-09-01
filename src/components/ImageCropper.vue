<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  modelValue?: string
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
const imageSize = ref({ width: 0, height: 0 })

const cropSize = computed(() => {
  const size = Math.min(containerSize.value.width, containerSize.value.height) * 0.8
  return size
})

const cropStyle = computed(() => ({
  width: `${cropSize.value}px`,
  height: `${cropSize.value}px`,
  left: `${(containerSize.value.width - cropSize.value) / 2}px`,
  top: `${(containerSize.value.height - cropSize.value) / 2}px`
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

function onImageLoad() {
  if (!imageRef.value || !containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  containerSize.value = { width: rect.width, height: rect.height }
  imageSize.value = {
    width: imageRef.value.naturalWidth,
    height: imageRef.value.naturalHeight
  }
  // 确保图片可见后再计算适配
  requestAnimationFrame(() => {
    fitImage()
  })
}

function fitImage() {
  if (!containerRef.value || !imageRef.value) return
  const { width: cw, height: ch } = containerSize.value
  const { width: iw, height: ih } = imageSize.value
  if (iw === 0 || ih === 0) return
  const scaleX = cw / iw
  const scaleY = ch / ih
  const fitScale = Math.min(scaleX, scaleY)
  minScale.value = fitScale * 0.5
  scale.value = fitScale
  translateX.value = 0
  translateY.value = 0
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newScale = Math.max(minScale.value, Math.min(maxScale.value, scale.value + delta))
  scale.value = newScale
}

function onMouseDown(e: MouseEvent) {
  isDragging.value = true
  dragStart.value = { x: e.clientX - translateX.value, y: e.clientY - translateY.value }
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  translateX.value = e.clientX - dragStart.value.x
  translateY.value = e.clientY - dragStart.value.y
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
  } else if (e.touches.length === 2) {
    const distance = getTouchDistance(e.touches)
    const scaleDelta = distance / touchStartDistance.value
    const newScale = Math.max(minScale.value, Math.min(maxScale.value, touchStartScale.value * scaleDelta))
    scale.value = newScale
  }
}

function onTouchEnd() {
  isDragging.value = false
}

async function cropImage(): Promise<File | null> {
  if (!imageRef.value || !imageFile.value) return null

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const { width: cw, height: ch } = containerSize.value
  const crop = cropSize.value

  const scaleRatio = scale.value
  const centerX = cw / 2
  const centerY = ch / 2

  const offsetX = (centerX - translateX.value) / scaleRatio
  const offsetY = (centerY - translateY.value) / scaleRatio

  const cropX = offsetX - crop / 2 / scaleRatio
  const cropY = offsetY - crop / 2 / scaleRatio
  const cropW = crop / scaleRatio
  const cropH = crop / scaleRatio

  canvas.width = crop
  canvas.height = crop

  ctx.drawImage(
    imageRef.value,
    cropX, cropY, cropW, cropH,
    0, 0, crop, crop
  )

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(null)
        return
      }
      const file = new File([blob], imageFile.value!.name, {
        type: imageFile.value!.type || 'image/png'
      })
      resolve(file)
    }, imageFile.value!.type || 'image/png')
  })
}

async function handleCrop() {
  const file = await cropImage()
  if (file) {
    emit('crop', file)
  }
}

onMounted(() => {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    containerSize.value = { width: rect.width, height: rect.height }
  }
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
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
        class="absolute border-2 border-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
        :style="cropStyle"
      >
        <div class="absolute inset-0 border border-white/30" />
      </div>
      <div
        v-if="imageUrl"
        class="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-primary/80 px-3 py-1 text-xs text-fg-secondary"
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
