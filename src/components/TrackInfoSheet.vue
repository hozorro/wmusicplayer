<script setup lang="ts">
/**
 * 曲目详情面板（bottom sheet）
 * 懒加载纪律：详情操作频率极低，仅在面板打开时请求；
 * 打开期间曲目切换则跟随重取，带竞态守卫防旧响应覆盖
 */
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { getTrackMoreInfo } from '@/apis/methods/music';

const open = defineModel<boolean>('open', { default: false });
const props = defineProps<{ trackId: number | null }>();

const { t } = useI18n()

// —— 详情（懒加载 + 竞态守卫） ——
const detailStatus = ref<'loading' | 'ready' | 'none'>('none')
const trackInfo = ref<TrackMoreInfo | null>(null)
let detailForId: number | null = null

async function loadDetail(id: number) {
  detailForId = id
  trackInfo.value = null
  detailStatus.value = 'loading'
  try {
    trackInfo.value = await getTrackMoreInfo(id).send()
    if (detailForId !== id) return
    detailStatus.value = trackInfo.value !== null ? 'ready' : 'none'
  } catch {
    if (detailForId !== id) return
    detailStatus.value = 'none'
  }
}

watch(open, o => {
  if (!o) return
  const id = props.trackId
  if (id != null) loadDetail(id)
  else detailStatus.value = 'none'
})
watch(() => props.trackId, id => {
  if (!open.value || id == null) return
  loadDetail(id)
})

// —— 拖拽关闭 ——
const dragY = ref(0)
const dragging = ref(false)
let startY = 0
function onDragStart(e: PointerEvent) {
  dragging.value = true
  startY = e.clientY
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function onDragMove(e: PointerEvent) {
  if (dragging.value) dragY.value = Math.max(0, e.clientY - startY)
}
function onDragEnd() {
  if (!dragging.value) return
  dragging.value = false
  const shouldClose = dragY.value > 90
  dragY.value = 0
  if (shouldClose) open.value = false
}
</script>

<template>
  <Teleport to="body">
    <!-- 遮罩 -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-200"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class=" fixed inset-0 z-[60] bg-primary/60" @click="open = false"></div>
    </Transition>

    <!-- 面板 -->
    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      leave-active-class="transition-transform duration-200 ease-in"
      enter-from-class="translate-y-full"
      leave-to-class="translate-y-full"
    >
      <section
        v-if="open"
        class=" fixed inset-x-0 bottom-0 z-[70] flex max-h-[72dvh] flex-col rounded-t-2xl bg-primary pb-[env(safe-area-inset-bottom)] shadow-2xl shadow-primary/60 ring-1 ring-fg-primary/10"
        :style="{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: dragging ? 'none' : 'transform 200ms ease-out'
        }"
      >
        <!-- 拖拽把手 -->
        <div
          class=" flex cursor-grab touch-none justify-center pb-1 pt-3 active:cursor-grabbing"
          @pointerdown="onDragStart"
          @pointermove="onDragMove"
          @pointerup="onDragEnd"
          @pointercancel="onDragEnd"
        >
          <div class=" h-1 w-10 rounded-full bg-fg-muted"></div>
        </div>

        <!-- 头部 -->
        <header class=" flex items-center justify-between px-5 pb-2 pt-1">
          <h2 class=" text-lg font-bold text-fg-primary">{{ t('player.more_track_info') }}</h2>
          <button
            class=" rounded-full p-2 text-fg-muted transition hover:bg-fg-primary/5 hover:text-fg-primary active:scale-90"
            :aria-label="t('common.close')"
            @click="open = false"
          >
            <svg viewBox="0 0 24 24" class="h-4.5 w-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <!-- 内容 -->
        <div class=" min-h-0 flex-1 overflow-y-auto px-5 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <template v-if="detailStatus === 'ready'">
            <div class=" mt-4 grid grid-cols-[128px_1fr_100px_1fr] gap-2 text-[15px] text-fg-muted leading-6">
              <div class=" text-right">TITLE:</div>
              <div class=" col-span-3 whitespace-pre-wrap">{{ trackInfo?.title }}</div>
              <div class=" text-right">ID:</div><div>{{ trackInfo?.id }}</div>
              <div class=" text-right">YEAR:</div><div>{{ trackInfo?.year }}</div>
              <div class=" text-right">BITRATE:</div><div>{{ trackInfo?.bitrate }}</div>
              <div class=" text-right">BR_MODE:</div><div>{{ trackInfo?.bitrate_mode || 'Unknown' }}</div>
              <div class=" text-right">CREATED:</div>
              <div class=" col-span-3 whitespace-pre-wrap">{{ trackInfo?.created_at }}</div>
              <div class=" text-right">ACOUSTID:</div>
              <div class=" col-span-3 whitespace-pre-wrap">{{ trackInfo?.acoustid_id }}</div>
              <div class=" text-right">MB_TRACKID:</div>
              <div class=" col-span-3 whitespace-pre-wrap">{{ trackInfo?.mb_trackid }}</div>
              <div class=" text-right">PATH:</div>
              <div class=" col-span-3 whitespace-pre-wrap">{{ trackInfo?.path }}</div>
            </div>
          </template>
          <div v-else-if="detailStatus === 'loading'" class=" flex items-center justify-center gap-3 py-14 text-sm text-fg-muted">
            <span class=" h-4 w-4 animate-spin rounded-full border-2 border-fg-muted border-t-accent" />
            {{ t('player.loading') }}
          </div>
          <div v-else class=" flex items-center justify-center py-14 text-sm text-fg-muted">
            {{ t('player.no_detail') }}
          </div>
        </div>
      </section>
    </Transition>
  </Teleport>
</template>
