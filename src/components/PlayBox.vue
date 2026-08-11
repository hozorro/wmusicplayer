<script setup lang="ts">
/**
 * PlayBox —— 悬浮条 ↔ 全屏 双状态，组件用不卸载
 * P6.2：全屏三模块 + 可拖动进度条 + 完整控制区 + 封面动态背景
 * 
 * 动态背景可读性方案（双主题）：
 * 1. 提取色经 ambientize/ambientizeLight 钳制：dark 亮度[0.12, 0.38]饱和度≤0.75，
 *    light 亮度[0.80, 0.94]饱和度≤0.45（粉彩）——均有单测守护
 * 2. 内容之上有按主题锁定的固定 scrim 渐变（dark 黑锁 / light 白锁），再锁一层对比度下限
 * 3. 所有文字 / 按钮用固定 zinc 色阶 + dark: 变体，从不从调色板派生前景色
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePlayer } from '@/composables/playback'
import { usePlayerQueue } from '@/composables/player-queue'
import { useLyrics } from '@/composables/lyrics'
import { toDetailText } from '@/services/transform'
import AmbientBackground from './AmbientBackground.vue'
import type { PlayMode } from '@/player/types'
import { formatTime } from '@/utilies/general'
import QueueSheet from './QueueSheet.vue'
import { getTrackMoreInfo, getFavoriteTrackIds } from '@/apis/methods/music.ts'
import { toggleTrackFav } from '@/idb/app-api/fav.ts'

const player = usePlayer()
const playQueue = usePlayerQueue()
const lyrics = useLyrics()
const route = useRoute()

// —— 形态 ——
const expanded = ref(false)
const hidden = computed(() => route.meta.hidePlayBar === true )
// 展开态进入隐藏页（如 settings, search等）：自动收起，避免全屏层滞留
watch(hidden, h => { if (h) expanded.value = false})
watch(expanded, e => { document.body.classList.toggle('overflow-hidden', e)})

// —— 曲目派生 ——
const track = computed(() => player.currentTrack.value)
const artistsText = computed(() => track.value?.artists?.map(a => a.name).join(', ') ?? '')

// —— 三模块切换（0 封面 / 1 歌词 / 2 详情） ——
const moduleIndex = ref(0)
let touchStartx = 0
function onTouchStart(e: TouchEvent) { touchStartx = e.touches[0].clientX}
function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - touchStartx
  if (Math.abs(dx) < 48) return
  moduleIndex.value = Math.max(0, Math.min(2,moduleIndex.value + (dx > 0 ? -1 : 1)))
}

// —— 歌词滚动 ——
const lyricScroller = ref<HTMLElement>()
function scrollLyricToCurrent(behavior: ScrollBehavior) {
  if (lyrics.currentLine.value < 0) return
  nextTick(() => {
    lyricScroller.value
      ?.querySelector<HTMLElement>(`[data-line="${lyrics.currentLine.value}"]`)
      ?.scrollIntoView({ behavior, block: 'center' })
  })
}
watch(() => lyrics.currentLine.value, () => {
  if (moduleIndex.value === 1) scrollLyricToCurrent('smooth')
})
watch(moduleIndex, i => { if (i === 1) scrollLyricToCurrent('auto')})
watch(track, () => { if (lyricScroller.value) lyricScroller.value.scrollTop = 0})

// —— 歌曲详情（端口 + 竞态守卫） ——
const detail = ref('')
const detailStatus = ref<'loading' | 'ready' | 'none'>('none')
let detailForId: number | null = null
watch(track, async t => {
  detail.value = ''
  if (!t) { detailStatus.value = 'none'; return }
  detailForId = t.id
  detailStatus.value = 'loading'
  try {
    const info = await getTrackMoreInfo(t.id).send()
    if (detailForId !== t.id) return
    detail.value = toDetailText(info)
    detailStatus.value = detail.value.trim() ? 'ready' : 'none'
  } catch {
    if (detailForId === t.id) return
    detailStatus.value = 'none'
  }
}, { immediate: true })

// —— 可拖动进度 ——
const seekBar = ref<HTMLElement>()
const scrubbing = ref(false)
const scrubRatio = ref(0)
const displayRatio = computed(() => 
  scrubbing.value
    ? scrubRatio.value
    : player.duration.value > 0
      ? Math.min(1, player.time.value / player.duration.value)
      : 0
)
function ratioFromEvent(e: PointerEvent): number {
  const rect = seekBar.value!.getBoundingClientRect()
  return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
}
function onScrubStart(e: PointerEvent) {
  if (player.duration.value <= 0) return
  scrubbing.value = true
  seekBar.value!.setPointerCapture(e.pointerId)
  scrubRatio.value = ratioFromEvent(e)
}
function onScrubMove(e: PointerEvent) {
  if (scrubbing.value) scrubRatio.value = ratioFromEvent(e)
}
function onScrubEnd(e: PointerEvent) {
  if (!scrubbing.value) return
  scrubbing.value = false
  seekBar.value!.releasePointerCapture(e.pointerId)
  player.seek(scrubRatio.value * player.duration.value)
}

// —— 播放模式循环 ——
const MODE_NEXT: Record<PlayMode, PlayMode> = {
  sequential: 'shuffle',
  'shuffle': 'loop-all',
  'loop-all': 'loop-one',
  'loop-one': 'sequential'
}
const MODE_LABEL = {
  sequential: '顺序播放',
  shuffle: '随机播放',
  'loop-all': '循环播放',
  'loop-one': '单曲循环'
}

// —— 收藏（本地态） ——
const favIds = ref(new Set<number>())
const favorited = computed(() => track.value ? favIds.value.has(track.value.id) : false)
async function toggleFavorite() {
  const t = track.value
  if (!t) return
  const res = await toggleTrackFav(t.id)
  if (!res) return
  const next = new Set(favIds.value)
  res.fav ? next.add(t.id) : next.delete(t.id)
  favIds.value = next
}

// —— 队列面板开关 ——
const showQueue = ref(false)

const barProgress = computed(() => 
  player.duration.value > 0
    ? Math.min(100, (player.time.value / player.duration.value) * 100)
    : 0
)

async function onLibraryRebuilt() {
  favIds.value = new Set(await getFavoriteTrackIds().send())
}

onMounted(() => window.addEventListener('idb-rebuilt', onLibraryRebuilt))
onUnmounted(() => window.removeEventListener('idb-rebuilt', onLibraryRebuilt))
</script>

<template>
  <!-- ============ 全屏层 ==============-->
  <Transition
    enter-active-class=" transition duation-300 ease-out"
    enter-from-class=" translate-y-10 opacity-0"
    leave-active-class=" transition duration-200 ease-in"
    leave-to-class=" translate-y-10 opacity-0"
  >
    <section v-if="expanded"
      class=" fixed inset-0 z-50 flex flex-col bg-primary pb-[env(safe-area-inset-bottom)] overflow-hidden"
    >
      <!-- 氛围层：封面调色板双层交叉淡入 + 固定 scrim（可读性结构锁）-->
      <div aria-hidden="true" class=" absolute inset-0">
        <AmbientBackground :cover="track?.cover" />
      </div>

      <div class=" relative flex h-full flex-col">
        <!-- 顶栏 -->
        <header class=" flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+10px)]">
          <button
            class=" rounded-full p-2.5 text-zinc-500 transition hover:bg-black/5 hover:text-zinc-800 active:scale-90 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100"
            aria-label="收起"
            @click="expanded = false"
          >
            <svg view-box="0 0 24 24" class=" h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9L6 6 6-6" />
            </svg>
          </button>
          <span class=" text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">正在播放</span>
          <div class=" w-10"></div>
        </header>

        <!-- ============ artwork / lyric / info ==============-->
        <div 
          class=" min-h-0 flex-1 touch-pan-y"
          @touchstart.passive="onTouchStart"
          @touchend.passive="onTouchEnd"
        >
          <div
            class=" flex h-full transition-transform duration-300 ease-out"
            :style="{ transform: `translateX(-${moduleIndex * 100}%)` }"
          >
            <!-- 模块 0：封面 -->
            <section class=" flex w-full shrink-0 items-center justify-center px-10">
              <div
                class=" aspect-square w-full max-w-xs overflow-hidden rounded-xl shadow-2xl shadow-black/20 ring-1 ring-black/10 transition-transform duration-500 ease-out dark:shadow-black/70 dark:ring-white/10 sm:max-w-sm"
                :class="player.isPlaying.value ? 'scale-100' : 'scale-[0.92]'"
              >
                <img v-if="track?.cover" :src="track.cover" alt="" class=" h-full w-full object-cover" />
                <div v-else class=" flex h-full items-center justify-center">
                  <svg viewBox="0 0 24 24" class="h-16 w-16 text-zinc-700" fill="currentColor">
                    <path d="M9 18V6l10-2v11.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    <circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="15.5" r="2.5" />
                  </svg>
                </div>
              </div>
            </section>

            <!-- 模块 1：歌词 -->
            <section class=" w-full shrink-0 px-8">
              <div ref="lyricScroller" class=" h-full overflow-y-auto py-14 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <template v-if="lyrics.status.value === 'ready'">
                  <p
                    v-for="(line, i) in lyrics.lines.value"
                    :key="i"
                    :data-line="i"
                    class="py-2.5 text-center transition-all duration-300"
                    :class="i === lyrics.currentLine.value ? ' text-xl font-bold text-zinc-900 dark:text-zinc-50' : ' text-[15px] leading-6 text-zinc-500'"
                  >
                    {{ line.text || '...' }}
                  </p>
                </template>
                <div v-else-if="lyrics.status.value === 'loading'" class=" flex h-full items-center justify-center gap-3 text-sm text-zinc-400">
                  <span class=" h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-amber-400 dark:border-zinc-600" />
                  歌词加载中...
                </div>
                <div v-else class=" flex h-full items-center justify-center text-sm text-zinc-500">
                  暂无歌词
                </div>
              </div>
            </section>

            <!-- 模块 2：信息 -->
            <section class=" w-full shrink-0 overflow-y-auto px-8 py-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <template v-if="detailStatus === 'ready'">
                <h3 class="text[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">歌曲详情</h3>
                <p class=" mt-4 whitespace-pre-wrap text-[15px] leading-7 text-zinc-700 dark:text-zinc-300">{{ detail }}</p>
              </template>
              <div v-else-if="detailStatus === 'loading'" class=" flex h-full items-center justify-center gap-3 text-sm text-zinc-400">
                <span class=" h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-amber-400 dark:border-zinc-600" />
                加载中...
              </div>
              <div v-else class=" flex h-full items-center justify-center text-sm text-zinc-500">
                暂无详细信息
              </div>
            </section>
          </div>
        </div>
        
        <!-- 模块指示点 -->
        <div class=" flex justify-center gap-2 pb-4 pt-2">
          <button
            v-for="i in 3"
            :key="i"
            class=" h-1.5 rounded-full transition-all duration-300"
            :class="moduleIndex === i - 1 ? 'w-5 bg-zinc-800 dark:bg-zinc-200' : 'w-1.5 bg-black/20 hover:bg-black/30 dark:bg-zinc-600 dark:hover:bg-zinc-500'"
            :aria-label="['封面', '歌词', '详情'][i - 1]"
            @click="moduleIndex = i - 1"
          />
        </div>

        <!-- 信息 + 收藏（恒定显示） -->
        <div class=" flex items-start justify-between gap-4 px-7">
          <div class=" min-w-0">
            <h2 class=" truncate text-xl font-bold text-zinc-900 dark:text-zinc-50">{{ track?.title ?? '未播放' }}{{ track?.id ?? '' }}</h2>
            <p class=" mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
              {{ artistsText }}<span v-if="track?.album"> - {{ track.album.title }}</span>
            </p>
          </div>
          <button 
            class=" mt-0.5 shrink-0 rounded-full p-2 transition active:scale-75"
            :class="favorited ? 'text-rose-400' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'"
            :aria-label="favorited ? '取消' : '收藏'"
            :disabled="!track"
            @click="toggleFavorite"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" :fill="favorited ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
          </button>
        </div>

        <!-- 可拖动进度条（恒定显示） -->
        <div class=" px-7 pt-3">
          <div
            ref="seekBar"
            class=" group relative flex h-7 cursor-pointer touch-none items-center"
            @pointerdown="onScrubStart"
            @pointermove="onScrubMove"
            @pointerup="onScrubEnd"
            @pointercancel="onScrubEnd"
          >
            <div class=" h-1 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
              <div
                class=" h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
                :class=" scrubbing ? '' : 'transition-[width] duration-200 ease-linear'"
                :style="{ width: `${displayRatio * 100}%`}">
              </div>
            </div>
            <div
              class=" absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-zinc-900 shadow-md transition-opacity dark:bg-zinc-50"
              :class="scrubbing ? 'opacity-100' : ' opacity-0 group-hover:opacity-100'"
              :style="{ left: `${displayRatio * 100}%`}"
            >
            </div>
          </div>
          <div class=" flex justify-between text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
            <span :class="scrubbing ? 'text-amber-400' : ''">{{ formatTime(displayRatio * player.duration.value) }}</span>
            <span>{{ formatTime(player.duration.value) }}</span>
          </div>
        </div>

        <!-- 控制区（恒定显示） -->
        <div class=" flex items-center justify-between px-7 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-2">
          <!-- 播放模式 -->
          <button
            class=" rounded-full p-2.5 transition hover:bg-black/5 active:scale-90 dark:hover:bg-white/5"
            :class="playQueue.mode.value === 'sequential' ? 'text-zinc-400' : 'text-amber-400'"
            :aria-label="MODE_LABEL[playQueue.mode.value]"
            @click="playQueue.setMode(MODE_NEXT[playQueue.mode.value])"
          >
            <svg v-if="playQueue.mode.value === 'sequential'" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M4 6h12M4 12h12M4 18h7" />
              <path d="M15 15l4 3-4 3v-6z" fill="currentColor" stroke="none" />
            </svg>
            <svg v-else-if="playQueue.mode.value === 'loop-all'" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 2l4 4-4 4" />
              <path d="M3 11v-1a4 4 0 014-4h14" />
              <path d="M7 22l-4-4 4-4" />
              <path d="M21 13v1a4 4 0 01-4 4H3" />
            </svg>
            <svg v-else-if="playQueue.mode.value === 'loop-one'" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 2l4 4-4 4" />
              <path d="M3 11v-1a4 4 0 014-4h14" />
              <path d="M7 22l-4-4 4-4" />
              <path d="M21 13v1a4 4 0 01-4 4H3" />
              <path d="M11 10h1v4" />
            </svg>
            <svg v-else viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 3h5v5" />
              <path d="M4 20L21 3" />
              <path d="M21 16v5h-5" />
              <path d="M15 15l6 6" />
              <path d="M4 4l5 5" />
            </svg>
          </button>

          <!-- 上一首 -->
          <button
            class=" rounded-full p-2 text-zinc-700 transition hover:bg-black/5 active:scale-90 disabled:pointer-events-none disabled:opacity-40 dark:text-zinc-200 dark:hover:bg-white/5"
            :disabled="!track"
            aria-label="上一首"
            @click="player.prev();"
          >
            <svg viewBox="0 0 24 24" class="h-7 w-7" fill="currentColor">
              <path d="M18 6l-8.5 6L18 18zM5.5 6H8v12H5.5z" />
            </svg>
          </button>

          <!-- 播放 / 暂停-->
          <button
            class=" relative flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 shadow-xl shadow-black/15 transition hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-40 dark:shadow-black/40"
            :disabled="!track"
            :aria-label="player.isPlaying.value ? '暂停' : '播放'"
            @click="player.toggle();"
          >
            <span
              v-if="player.isBuffering.value"
              class=" absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-amber-500"
            ></span>
            <svg v-if="player.isPlaying.value" viewBox="0 0 24 24" class="h-7 w-7" fill="currentColor">
              <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
            </svg>
            <svg v-else viewBox="0 0 24 24" class="ml-1 h-7 w-7" fill="currentColor">
              <path d="M8 5.5v13l10.5-6.5z" />
            </svg>
          </button>

          <!-- 下一首 -->
          <button
            class=" rounded-full p-2 text-zinc-700 transition hover:bg-black/5 active:scale-90 disabled:pointer-events-none disabled:opacity-40 dark:text-zinc-200 dark:hover:bg-white/5"
            :disabled="!track"
            aria-label="下一首"
            @click="player.next();"
          >
            <svg viewBox="0 0 24 24" class="h-7 w-7" fill="currentColor">
              <path d="M6 6l8.5 6L6 18zM16 6h2.5v12H16z" />
            </svg>
          </button>

          <!-- 播放清单 -->
          <button
            class=" rounded-full p-2.5 text-zinc-500 transition hover:bg-black/5 hover:text-zinc-700 active:scale-90 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-200"
            aria-label="播放清单"
            @click="showQueue = true"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M4 6h12M4 11h12M4 16h7" />
              <path d="M19 18V6l-4.5 1" />
              <circle cx="17" cy="18" r="2.3" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  </Transition>

  <!-- ============ 悬浮条 ==============-->
  <div v-show="!hidden" class=" fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+20px)] z-40">
    <div 
      class=" relative overflow-hidden rounded-xl bg-primary/90 shadow-2xl shadow-black/15 ring-1 ring-black/5 backdrop-blur-xl transition-transform duration-150 active:scale-[0.98] dark:shadow-black/50 dark:ring-white/10"
      role="button"
      tabindex="0"
      aria-label="展开播放器"
      @click="expanded = true"
      @keydown.enter="expanded = true"
    >
      <div class=" flex items-center gap-3 py-2 pl-2.5 pr-1.5">
        <div class=" h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-primary">
          <img v-if="track?.cover" :src="track.cover" alt="" class=" h-full w-full object-cover" />
          <svg v-else viewBox="0 0 24 24" class="m-auto mt-3 h-5 w-5 text-fg-primary" fill="currentColor">
            <path d="M9 18V6l10-2v11.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="15.5" r="2.5" />
          </svg>
        </div>

        <div class=" min-w-0 flex-1">
          <p class=" truncate text-sm font-semibold text-fg-primary">{{ track?.title ?? '未在播放' }}{{ track?.id ?? '' }}</p>
          <p class=" truncate text-xs text-fg-muted">{{ track ? artistsText : '点击打开播放器' }}</p>
        </div>

        <!-- 缓冲指示 -->
        <span 
          v-if="player.isBuffering.value"
          class=" h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-secondary border-t-accent"
          aria-label="缓冲中"
        ></span>

        <button
          class=" flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-fg-primary transition hover:bg-black/5 active:scale-90 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-white/10"
          :disabled="!track"
          :aria-label="player.isPlaying.value ? '暂停' : '播放'"
          @click.stop="player.toggle()"
        >
          <svg v-if="player.isPlaying.value" viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor">
            <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
          </svg>
          <svg v-else viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor">
            <path d="M8 5.5v13l10.5-6.5z" />
          </svg>
        </button>

        <button
          class=" flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-fg-primary transition hover:bg-black/5 hover:text-fg-primary active:scale-90 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-white/10"
          :disabled="!track"
          aria-label="下一首"
          @click.stop="player.next()"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor">
            <path d="M6 6l8.5 6L6 18zM16 6h2.5v12H16z" />
          </svg>
        </button>
      </div>

      <!-- 进度细线：仅展示，不可拖动-->
      <div class=" absolute inset-x-0 bottom-0 h-[2px] bg-black/10 dark:bg-white/10">
        <div class=" h-full bg-accent transition-[width] duration-300 ease-linear" :style="{ width: `${barProgress}%`}"></div>
      </div>
    </div>
  </div>

  <!-- 播放清单 -->
  <QueueSheet v-model:open="showQueue" />
</template>