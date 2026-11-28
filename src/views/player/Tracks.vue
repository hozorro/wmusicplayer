<script setup lang="ts">
/** 全部曲目：三种排序 + Genre.vue 同款无限滚动分页 */
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePagination } from 'alova/client'
import TrackList from '@/components/TrackList.vue'
import type { PlayTrack } from '@/player/types'
import { toPlayTrack } from '@/services/transform'
import { getTracksBySort } from '@/apis/methods/music'

const SORTS = ['latest', 'hot', 'history'] as const
type Sort = typeof SORTS[number]
const normalizeSort = (v: unknown): Sort => SORTS.includes(v as Sort) ? v as Sort : 'latest'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const sort = ref<Sort>(normalizeSort(route.params.sort))
const tabs = computed(() => [
  { key: 'latest' as const, label: t('player.latest_added') },
  { key: 'hot' as const, label: t('player.most_played') },
  { key: 'history' as const, label: t('player.play_history') }
])

const tracks = ref<PlayTrack[]>([])
const sentinel = ref<HTMLElement>()
const endReached = ref(false)

// alova 的 total/data 是共享状态：切 tab 后旧请求的迟到响应仍会覆盖它们。
// 请求发出时打代次标记，pageUpdated 只接受当前代次响应（含 A→B→A 场景）。
let generation = 0
const generations = new WeakMap<object, number>()

const {
  data: pageTracks, page,
  loading: loadingMore, reload, onSuccess: pageUpdated
} = usePagination((p, pageSize) => {
  const method = getTracksBySort(sort.value, p, pageSize)
  generations.set(method as object, generation)
  return method
}, {
  total: res => res.total,
  data: res => res.tracks,
  initialPage: 1,
  initialPageSize: 20,
  immediate: true,
  preloadPreviousPage: false,
  preloadNextPage: false
})

pageUpdated(res => {
  if (generations.get(res.method as object) !== generation) return
  const incoming = pageTracks.value
  tracks.value.push(...incoming.map(t => toPlayTrack(t)))
  // 只信任本次响应的 total，避免 alova 共享 total 被旧响应污染
  const responseTotal = Number(res.data?.total ?? 0)
  endReached.value = incoming.length === 0 || tracks.value.length >= responseTotal
  if (!endReached.value) {
    void nextTick().then(() => {
      const el = sentinel.value
      if (el && el.getBoundingClientRect().top < window.innerHeight + 200) loadMore()
    })
  }
})

const observer = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting && !loadingMore.value && !endReached.value) loadMore()
}, { rootMargin: '200px' })
watch(sentinel, el => {
  observer.disconnect()
  if (el) observer.observe(el)
}, { flush: 'post' })
onUnmounted(() => observer.disconnect())

function loadMore() {
  if (loadingMore.value || endReached.value) return
  page.value++
}

function resetAndReload() {
  generation++
  tracks.value = []
  endReached.value = false
  window.scrollTo({ top: 0, behavior: 'smooth' })
  void reload()   // reload 自身回到第 1 页并清缓存，不要再手动 page.value = 1
}

function switchSort(key: Sort) {
  if (key === sort.value) return
  sort.value = key
  void router.replace(`/tracks/${key}`)
  resetAndReload()
}

watch(() => route.params.sort, v => {
  const next = normalizeSort(v)
  if (next === sort.value) return   // 自己触发的 replace 不再重复请求
  sort.value = next
  resetAndReload()
})

if (route.params.sort !== sort.value) void router.replace(`/tracks/${sort.value}`)
</script>

<template>
  <div class="min-h-dvh">
    <div class="sticky top-0 z-30 border-b border-white/5 backdrop-blur-md">
      <div class="mx-auto flex max-w-2xl items-center gap-2 pl-2 pr-4 py-2.5 pt-[calc(env(safe-area-inset-top)+10px)]">
        <button class="rounded-full p-2 text-fg-secondary transition hover:bg-white/8 active:scale-90"
                :aria-label="t('common.back')" @click="router.back()">
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <h1 class="min-w-0 flex-1 text-lg font-bold text-fg-primary">{{ t('player.all_tracks') }}</h1>
      </div>
    </div>

    <main class="mx-auto max-w-2xl px-4 pb-32 pt-4">
      <div class="flex rounded-full bg-white/[0.05] p-1 ring-1 ring-white/10">
        <button v-for="tab in tabs" :key="tab.key"
                class="rounded-full px-3.5 py-1.5 text-xs font-semibold transition"
                :class="sort === tab.key ? 'bg-accent text-fg-primary shadow-md shadow-accent/20' : 'text-fg-secondary hover:text-fg-primary'"
                @click="switchSort(tab.key)">
          {{ tab.label }}
        </button>
      </div>

      <TrackList v-if="tracks.length" :tracks="tracks" :show-art="true" class="mt-4" />
      <p v-else-if="!loadingMore" class="py-16 text-center text-sm text-fg-muted">{{ t('player.no_tracks') }}</p>
      <div v-else class="mt-6 space-y-2">
        <div v-for="n in 8" :key="n" class="h-12 animate-pulse rounded-xl bg-secondary/50" />
      </div>

      <div ref="sentinel" class="h-px" />
      <div v-if="loadingMore && tracks.length" class="flex items-center justify-center gap-3 py-6 text-sm text-fg-muted">
        <span class="h-4 w-4 animate-spin rounded-full border-2 border-fg-secondary border-t-accent" />
        {{ t('player.loading') }}
      </div>
      <p v-else-if="endReached && tracks.length" class="py-6 text-center text-xs text-fg-secondary">
        {{ t('common.page_load_complete') }} {{ tracks.length }} {{ t('player.unit_track') }}
      </p>
    </main>
  </div>
</template>
