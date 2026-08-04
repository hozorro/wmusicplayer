<script setup lang="ts">
/**
 * 当前播放清单面板（bottom sheet）
 * 交互纪律：
 * - 重排反馈：TransitionGroup FLIP 滑行，置顶/下一曲/删除后的位移肉眼可追
 * - 即时执行：队列操作均为低成本可逆动作，不设确认弹窗
 * - 菜单单开：openMenuId 保证任意时刻至多一个项内菜单展开
 */
import { nextTick, ref, watch } from 'vue';
import { usePlayerQueue } from '@/composables/player-queue';
import { usePlayer } from '@/composables/playback';
import EntityMenuButton from './EntityMenuButton.vue';

const open = defineModel<boolean>('open', { default: false });

const playQueue = usePlayerQueue()
const player = usePlayer()

const openMenuId = ref<number | null>(null)
const listEl = ref<HTMLElement>()

// 打开 -> 自动滚动到当前曲目
watch(open, async o => {
  if(!o) { openMenuId.value = null; return }
  await nextTick()
  listEl.value
    ?.querySelector<HTMLElement>(`[data-index="${playQueue.currentIndex.value}"]`)
    ?.scrollIntoView({ block: 'center'})
})

function selectAt(i: number) {
  player.playAt(i)        // 面板保持打开，供连续管理；高亮随 currentIndex 自动跟随
}

function remove(i: number) {
  playQueue.removeAt(i)   // 删除当前曲目时游标原位滑入，播放无缝接管
}

function pinTop(i: number) {
  playQueue.move(i, 0)    // 注：乱序模式下指定改变展示序，不改变洗牌后的播放序
  openMenuId.value = null
  nextTick(() => listEl.value?.scrollTo({ top: 0, behavior: 'smooth' }))
}

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
      <div v-if="open" class=" fixed inset-0 z-[60] bg-black/60" @click="open = false"></div>
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
        class=" fixed inset-x-0 bottom-0 z-[70] flex max-h-[72dvh] flex-col rounded-t-2xl bg-zinc-900 pb-[env(safe-area-inset-bottom)] shadow-2xl shadow-black/60 ring-1 ring-white/10"
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
          <div class=" h-1 w-10 rounded-full bg-zinc-600"></div>
        </div>

        <!-- 头部 -->
        <header class=" flex items-center justify-between px-5 pb-2 pt-1">
          <div class=" flex items-baseline gap-2.5">
            <h2 class=" text-lg font-bold text-zinc-50">当前播放清单</h2>
            <span class=" text-xs tabular-nums text-zinc-500"> {{ playQueue.tracks.value.length }} 首</span>
          </div>
          <div class=" flex items-center gap-1">
            <button
              class=" rounded-full px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
              :disabled="playQueue.tracks.value.length === 0"
              @click="playQueue.clear()"
            >
              清空
            </button>
            <button
              class=" rounded-full p-2 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100 active:scale-90"
              aria-label="关闭"
              @click="open = false"
            >
              <svg viewBox="0 0 24 24" class="h-4.5 w-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </header>

        <!-- 列表 -->
        <div ref="listEl" class=" min-h-0 flex-1 overflow-y-auto px-2 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <!-- 空态 -->
          <div v-if="playQueue.tracks.value.length === 0" class=" flex flex-col items-center gap-3 py-16">
            <svg viewBox="0 0 24 24" class="h-10 w-10 text-zinc-700" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M4 6h12M4 11h12M4 16h7" /><path d="M19 18V6l-4.5 1" /><circle cx="17" cy="18" r="2.3" fill="currentColor" stroke="none" />
            </svg>
            <p class="text-sm text-zinc-500">清单为空，去挑几首歌吧</p>
          </div>

          <TransitionGroup
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 translate-x-4"
            leave-active-class="transition duration-200 ease-in"
            leave-to-class="opacity-0 -translate-x-6"
            move-class="transition-transform duration-300 ease-out"
          >
            <div
              v-for="(t, i) in playQueue.tracks.value"
              :key="t.id"
              :data-index="i"
              class=" rounded-xl transition-colors"
              :class="i ===playQueue.currentIndex.value ? 'bg-amber-400/10' : 'hover:bg-white/5'"
            >
              <div class=" flex items-center gap-2.5 px-3 py-2.5">
                <!-- 当前曲目：频谱条；其余：序号 -->
                <div class=" flex w-6 shrink-0 items-center justify-center">
                  <div v-if="i === playQueue.currentIndex.value" class=" flex h-3.5 items-end gap-[3px]">
                    <span
                      class=" w-[3px] rounded-sm bg-amber-400 animate-bounce [animation-delay:-0.32s] [animation-duration:0.8s]"
                      :class="player.isPlaying.value ? '' : '[animation-play-state:paused]'"
                      style="height: 55%;"
                    />
                    <span
                      class="w-[3px] rounded-sm bg-amber-400 animate-bounce [animation-delay:-0.16s] [animation-duration:1s]"
                      :class="player.isPlaying.value ? '' : '[animation-play-state:paused]'"
                      style="height: 100%"
                    />
                    <span
                      class="w-[3px] rounded-sm bg-amber-400 animate-bounce [animation-duration:0.9s]"
                      :class="player.isPlaying.value ? '' : '[animation-play-state:paused]'"
                      style="height: 70%"
                    />
                  </div>
                  <span v-else class=" text-xs tabular-nums text-zinc-600">{{ i + 1 }}</span>
                </div>

                <!-- 标题块：点击切歌 -->
                <button class=" min-w-0 flex-1 py-0.5 text-left" @click="selectAt(i)">
                  <p
                    class=" truncate text-sm"
                    :class="i === playQueue.currentIndex.value
                      ? 'font-semibold text-amber-400'
                      : 'font-medium text-zinc-100'"
                  >
                    {{ t.title }}
                  </p>
                  <p class=" mt-0.5 truncate text-xs text-zinc-500">{{ t.artists ? t.artists.map(a => a.name).join(', ') : '' }}</p>
                </button>

                <!-- 删除 -->
                <button
                  class=" shrink-0 rounded-full p-2 text-zinc-500 transition hover:bg-white/10 hover:text-zinc-200 active:scale-90"
                  :aria-label="`删除 ${t.title}`"
                  @click="remove(i)"
                >
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>

                <button
                  class=" inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-xs font-medium text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/15 active:scale-95"
                  @click="pinTop(i)"
                >
                  <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                  置顶
                </button>

                <EntityMenuButton :source="{ kind: 'queue-track', track: t, index: i }" />
              </div>
            </div>
          </TransitionGroup>
        </div>
      </section>
    </Transition>
  </Teleport>
</template>