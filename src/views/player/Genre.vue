<script setup lang="ts">
/** 
 * 流派详情
 * genre color 升格为全宽 banner hero（A52折叠范式的无图变体）
 * 曲目无限滚动分页（A53）：sentinel观察 + 视口补载循环 + 路由守卫
 */
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TrackList from '@/components/TrackList.vue';
import { toPlayTrack } from '@/services/transform';
import type { PlayTrack } from '@/player/types';
import { usePlayer } from '@/composables/playback';
import { useCollapseHeader } from '@/composables/collapse-header';
import { readableTextColor, shade } from '@/utilies/palette';

import { usePagination } from 'alova/client';
import { useI18n } from 'vue-i18n';
import { getGenre, getGenreTracks, getGenreRandomTracks } from '@/apis/methods/music';


const { t } = useI18n()

const genre = ref<Genre | null>(null)
const route = useRoute()
const router = useRouter()
const player = usePlayer()

const tracks = ref<PlayTrack[]>([])

// ── 折叠页头（A52 同构）──
const { heroStyle, compactStyle, reset: resetCollapse } = useCollapseHeader({ range: 180, parallax: 60 })

// ── 色值派生 ──
const textColor = computed(() => genre.value ? readableTextColor(genre.value.color) : '#fafafa')
const bannerBg = computed(() => genre.value
  ? `linear-gradient(150deg, ${genre.value.color} 0%, ${shade(genre.value.color, -0.16)} 100%)`
  : undefined)

watch(() => route.params.id, async id => {
  if (!id) return 
  genre.value = null
  resetCollapse()
  window.scrollTo({ top: 0, behavior: 'smooth' })
  genre.value = await getGenre(Number(id)).send()
}, { immediate: true })

const lastKey = ref<string | null>(null)
const { 
  data: appendedTracks, 
  page,
  isLastPage,
  loading: loadingMore,
  onSuccess: pageUpdated
} = usePagination((page, pageSize) => {
  let lastKeyValue = lastKey.value == null ? null : encodeURIComponent(lastKey.value);
  return getGenreTracks(Number(route.params.id), page, pageSize, lastKeyValue)
},{
  total: res => res.total,
  data: res => res.tracks,
  initialPage: 1,
  initialPageSize: 20,
  immediate: true,
  preloadPreviousPage: false,
  preloadNextPage: false
})
pageUpdated(res => {
  tracks.value.push(...appendedTracks.value.map(t => toPlayTrack(t)))
  if(res.data.next_key) {
    lastKey.value = res.data.next_key
  } else {
    lastKey.value = tracks.value.length > 0 ? tracks.value[tracks.value.length - 1].title : null
  } 
})

// —— 无限滚动 ——
const sentinel = ref<HTMLElement>()
const observer = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting && !isLastPage.value) loadMore()
}, { rootMargin: '200px', threshold: 1.0 })

watch(sentinel, el => {
  observer.disconnect()
  if (el) observer.observe(el)
}, { flush: 'post' })

onUnmounted(() => { observer.disconnect() })

async function loadMore() {
  const id = Number(route.params.id)
  do {
    page.value++
    if (Number(route.params.id) !== id) return
    await nextTick()
    // 视口补载：列表未填满时，sentinel 持续可见，IO不会二次触发，主动续载
    const el = sentinel.value
    const stillVisible = el
      ? el.getBoundingClientRect().top < window.innerHeight + 200
      : false
    if (!stillVisible || isLastPage.value) break
  } while (true)
}

async function playRandomTracks() {
  const tracks = await getGenreRandomTracks(genre.value!.id).send()
  player.playAll(tracks.map(t => toPlayTrack(t)))
}
</script>

<template>
  <div class="min-h-dvh">
    <!-- 固定顶栏：返回 + 折叠标题 -->
    <div class="fixed inset-x-0 top-0 z-30 bg-gradient-to-b from-black/60 via-black/30 to-transparent pb-6 pt-[calc(env(safe-area-inset-top)+10px)]">
      <div class="mx-auto flex max-w-2xl items-center gap-3 px-4">
        <button
          class="shrink-0 rounded-full bg-black/30 p-2 text-zinc-100 ring-1 ring-white/10 transition hover:bg-black/50 active:scale-90"
          aria-label="返回"
          @click="router.back()"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <h2 :style="compactStyle" class="min-w-0 flex-1 truncate text-base font-bold text-zinc-50">
          {{ genre?.name ?? '…' }}
        </h2>
      </div>
    </div>

    <template v-if="genre">
      <!-- ═══ 彩色 banner hero ═══ -->
      <header :style="heroStyle" class="will-change-transform">
        <div class="relative overflow-hidden" :style="{ background: bannerBg }">
          <!-- 首字母水印 -->
          <span
            class="pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 text-[160px] font-black leading-none opacity-[0.1]"
            :style="{ color: textColor }"
          >
            {{ genre.name.slice(0, 1) }}
          </span>
          <div class="relative mx-auto flex min-h-[230px] max-w-2xl flex-col justify-end px-5 pb-6 pt-[calc(env(safe-area-inset-top)+72px)]">
            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70" :style="{ color: textColor }">
              Genre
            </p>
            <h1 class="mt-1 text-3xl font-black tracking-tight" :style="{ color: textColor }">
              {{ genre.name }}
            </h1>
            <p class="mt-1.5 text-xs tabular-nums opacity-75" :style="{ color: textColor }">
              {{ genre.track_count }} 首曲目
            </p>
          </div>
          <!-- 底部过渡到页面底色 -->
          <div class="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-950/80 to-transparent" />
        </div>
        
        <!-- actions: 播放全部 / 随机播放 -->
        <div class=" mt-5 flex gap-2.5">
          <button
            class=" rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-zinc-950 shadow-lg shadow-amber-400/20 transition hover:bg-amber-300 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
            :disabled="tracks.length === 0"
            @click="player.playAll(tracks)"
          >
            {{ t('player.playall') }}
          </button>
          <button
            class=" rounded-full px-5 py-2 text-sm font-semibold text-zinc-200 ring-1 ring-white/15 transition hover:bg-white/10 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
            @click="playRandomTracks"
          >
            {{ t('player.randomplay') }}
          </button>
        </div>
      </header>

      <!-- ═══ 曲目列表 + 无限滚动 ═══ -->
      <main class="mx-auto max-w-2xl px-4 pb-32">
        <h2 class="pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          曲目 <span class="tabular-nums">· {{ genre.track_count }}</span>
        </h2>

        <TrackList v-if="tracks.length" :tracks="tracks" :show-art="true" />
        <p v-else-if="!loadingMore" class="py-16 text-center text-sm text-zinc-500">该流派暂无曲目</p>

        <!-- sentinel + 加载状态 -->
        <div ref="sentinel" class="h-px" />
        <div v-if="loadingMore" class="flex items-center justify-center gap-3 py-6 text-sm text-zinc-400">
          <span class="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-400" />
          加载中
        </div>
        <p v-else-if="isLastPage && tracks.length" class="py-6 text-center text-xs text-zinc-600">
          已加载全部 {{ tracks.length }} 首
        </p>
      </main>
    </template>

    <!-- skeleton -->
    <div v-else class="animate-pulse">
      <div class="h-[230px] w-full bg-zinc-800/60" />
      <div class="mx-auto max-w-2xl space-y-3 px-4 pt-8">
        <div v-for="n in 8" :key="n" class="h-12 rounded-xl bg-zinc-800/50" />
      </div>
    </div>
  </div>
</template>