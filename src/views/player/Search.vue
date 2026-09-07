<script setup lang="ts">
/**
 * 搜索页 —— P7.6.4：假搜索框的落地页
 * 120ms 防抖 + 序列号竞态守卫（A41）；匹配子串高亮；
 * 最近搜索 localStorage 自持；双 tab 自动偏向非空一侧。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import NowPlayingIndicator from '@/components/NowPlayingIndicator.vue'
import EntityMenuButton from '@/components/EntityMenuButton.vue'
import ArtistRow from '@/components/ArtistRow.vue'
import { toPlayTrack } from '@/services/transform'
import type { PlayTrack } from '@/player/types'
import { formatTime } from '@/utilies/general'
import { usePlayer } from '@/composables/playback'
import { SEARCH_TYPE_LIMIT } from '@/constants/library'
import { getCollectionTracks, searchLibrary } from '@/apis/methods/music'

// import { searchLibrary } from '@/api/…'

const router = useRouter()
const player = usePlayer()
const { t } = useI18n()

const input = ref<HTMLInputElement>()
const q = ref('')
const tab = ref<'tracks' | 'artists' | 'albums'>('tracks')
const results = ref<SearchResults>({ tracks: [], artists: [], albums: [] })
const searching = ref(false)
const searched = ref(false)
let searchSeq = 0

onMounted(() => input.value?.focus())

const playTracks = computed(() => results.value.tracks.map(t => toPlayTrack(t)))
const isCurrent = (id: number) => player.currentTrack.value?.id === id

// ── 防抖 + 竞态守卫 ──
watch(q, async () => {
  const query = q.value.trim()
  await new Promise(r => setTimeout(r, 120))       // 防抖窗口
  if (query !== q.value.trim()) return             // 窗口内已有新输入
  if (!query) {
    results.value = { tracks: [], artists: [], albums: [] }
    searched.value = false
    searching.value = false
    return
  }
  runSearch(query)
})

async function runSearch(query: string) {
  searching.value = true
  const seq = ++searchSeq
  try {
    const r = await searchLibrary(query).send()
    if (seq !== searchSeq) return                  // 过期响应丢弃（A41）
    results.value = r
    searched.value = true
    // 当前 tab 为空时，偏向首个非空 tab（优先级：tracks > artists > albums）
    const TAB_PRIORITY = ['tracks', 'artists', 'albums'] as const
    if (!r[tab.value].length) {
      const nonEmpty = TAB_PRIORITY.find(t => r[t].length)
      tab.value = nonEmpty || 'tracks'
    }
    remember(query)
  } finally {
    if (seq === searchSeq) searching.value = false
  }
}

/** 回车：跳过防抖立即搜索 */
function searchNow() {
  const query = q.value.trim()
  if (query) runSearch(query)
}

// ── 匹配高亮：首段命中切分 ──
function segments(text: string): { text: string; hit: boolean }[] {
  const query = q.value.trim().toLowerCase()
  if (!query) return [{ text, hit: false }]
  const idx = text.toLowerCase().indexOf(query)
  if (idx === -1) return [{ text, hit: false }]
  return [
    { text: text.slice(0, idx), hit: false },
    { text: text.slice(idx, idx + query.length), hit: true },
    { text: text.slice(idx + query.length), hit: false },
  ]
}

function playFromResults(i: number) {
  player.playAll(playTracks.value, i)
}

async function resolveAlbumTracks(id: number): Promise<PlayTrack[]> {
  const detail = await getCollectionTracks(id, 'album').send()
  return detail.map(t => toPlayTrack(t))
}

// ── 最近搜索：localStorage 自持 ──
const RECENT_KEY = 'recent-searches'
const recents = ref<string[]>([])
try { recents.value = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { /* 损坏即弃 */ }

function remember(query: string) {
  const list = [query, ...recents.value.filter(r => r !== query)].slice(0, 8)
  recents.value = list
  localStorage.setItem(RECENT_KEY, JSON.stringify(list))
}
function clearRecents() {
  recents.value = []
  localStorage.removeItem(RECENT_KEY)
}

const tabs = computed(() => [
  { key: 'tracks' as const, label: t('player.track'), count: results.value.tracks.length },
  { key: 'artists' as const, label: t('player.artist'), count: results.value.artists.length },
  { key: 'albums' as const, label: t('player.album'), count: results.value.albums.length },
].map(t => ({...t, capped: t.count >= SEARCH_TYPE_LIMIT })))
</script>

<template>
  <div class="min-h-dvh">
    <!-- ═══ 粘性头部：返回 + 搜索输入 + tabs ═══ -->
    <div class="sticky top-0 z-30 border-b border-fg-primary/5 backdrop-blur-md">
      <div class="mx-auto flex max-w-2xl items-center gap-2.5 px-4 py-2.5 pt-[calc(env(safe-area-inset-top)+10px)]">
        <button
          class="shrink-0 rounded-full p-2 text-fg-secondary transition hover:bg-fg-primary/8 hover:text-fg-primary active:scale-90"
          :aria-label="t('common.back')"
          @click="router.back()"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>

        <div class="relative min-w-0 flex-1">
          <svg viewBox="0 0 24 24" class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
               fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref="input"
            v-model="q"
            type="search"
            :placeholder="t('player.search_tip')"
            enterkeyhint="search"
            class="w-full rounded-full bg-fg-primary/[0.06] py-1 pl-10 pr-16 text-[16px] text-fg-primary outline-none ring-1 ring-fg-primary/10 transition placeholder:text-fg-muted focus:bg-fg-primary/[0.08] focus:ring-2 focus:ring-accent/50 [&::-webkit-search-cancel-button]:hidden"
            @keydown.enter="searchNow"
          />
          <div class="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
            <span v-if="searching" class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-fg-secondary border-t-accent" />
            <button
              v-if="q"
              class="rounded-full p-1 text-fg-muted transition hover:text-fg-primary active:scale-90"
              :aria-label="t('common.clear')"
              @click="q = ''; input?.focus()"
            >
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- tabs：带计数，随搜索出现 -->
      <Transition
        enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 -translate-y-1"
        leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0 -translate-y-1"
      >
        <div v-if="searched" class="mx-auto flex max-w-2xl gap-2 px-4 pb-2.5">
          <button
            v-for="t in tabs" :key="t.key"
            class="rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95"
            :class="tab === t.key
              ? 'bg-accent text-primary shadow-md shadow-accent/20'
              : 'bg-fg-primary/5 text-fg-muted ring-1 ring-fg-primary/10 hover:text-fg-secondary'"
            @click="tab = t.key"
          >
            {{ t.label }} · {{ t.capped ? `${t.count}+` : t.count }}
          </button>
        </div>
      </Transition>
    </div>

    <main class="mx-auto max-w-2xl px-2 pb-32 pt-3">
      <!-- ═══ 引导态：无查询 ═══ -->
      <div v-if="!q.trim()" class="px-4 pt-14">
        <div class="flex flex-col items-center text-center">
          <span class="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
            <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
            </svg>
          </span>
          <h2 class="mt-4 text-lg font-bold text-fg-primary">{{ t('player.search_tip') }}</h2>
          <p class="mt-1 text-xs text-fg-muted">{{ t('player.search_des') }}</p>
        </div>

        <div v-if="recents.length" class="mt-10">
          <div class="flex items-center justify-between">
            <h3 class="text-[11px] font-semibold uppercase tracking-[0.2em] text-fg-muted">{{ t('player.search_latest') }}</h3>
            <button class="text-[11px] text-fg-muted transition hover:text-fg-secondary active:scale-95" @click="clearRecents">
              {{ t('common.clear') }}
            </button>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <button
              v-for="r in recents" :key="r"
              class="rounded-full bg-fg-primary/[0.05] px-3.5 py-1.5 text-xs font-medium text-fg-muted ring-1 ring-fg-primary/10 transition hover:bg-fg-primary/10 hover:text-fg-primary active:scale-95"
              @click="q = r"
            >
              {{ r }}
            </button>
          </div>
        </div>
      </div>

      <!-- ═══ 结果区 ═══ -->
      <template v-else-if="searched">
        <!-- 歌曲 tab -->
        <div v-if="tab === 'tracks'">
          <TransitionGroup
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="opacity-0 translate-y-1"
          >
            <div
              v-for="(t, i) in playTracks" :key="t.id"
              class="flex items-center gap-1.5 rounded-xl px-3 py-2.5 transition hover:bg-fg-primary/5"
              :class="isCurrent(t.id) ? 'bg-accent text-primary' : ''"
            >
              <button class="flex min-w-0 flex-1 items-center gap-3 text-left" @click="playFromResults(i)">
                <div class="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-secondary ring-1 ring-white/5">
                  <img v-if="t.cover" :src="t.cover" alt="" class="h-full w-full object-cover" />
                  <svg v-else viewBox="0 0 24 24" class="m-auto mt-2.5 h-5 w-5 text-fg-muted" fill="currentColor">
                    <path d="M9 18V6l10-2v11.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    <circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="15.5" r="2.5" />
                  </svg>
                  <span v-if="isCurrent(t.id)" class="absolute bottom-0.5 left-0.5 rounded bg-primary/55 p-1">
                    <NowPlayingIndicator :playing="player.isPlaying.value" class="origin-bottom-left scale-[0.55]" />
                  </span>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm" :class="isCurrent(t.id) ? 'font-semibold text-accent' : 'font-medium text-fg-primary'">
                    <template v-for="(seg, _si) in segments(t.title)" :key="_si">
                      <span :class="seg.hit && !isCurrent(t.id) ? 'text-accent' : ''">{{ seg.text }}</span>
                    </template>
                  </p>
                  <p class="mt-0.5 truncate text-xs text-fg-muted">{{ t.artists?.map(a => a.name).join(' / ') }}</p>
                </div>
              </button>
              <span v-if="t.duration" class="shrink-0 text-xs tabular-nums text-fg-muted">
                {{ formatTime(t.duration) }}
              </span>
              <EntityMenuButton :source="{ kind: 'track', track: t }" />
            </div>
            <p
              v-if="results[tab].length >= SEARCH_TYPE_LIMIT"
              class="py-4 text-center text-[11px] text-fg-muted"
            >
              {{ t('player.search_hint', { limit: SEARCH_TYPE_LIMIT }) }}
            </p>
          </TransitionGroup>
          <p v-if="!playTracks.length" class="py-16 text-center text-sm text-fg-muted">
            {{ t('player.search_no_track') }}
          </p>
        </div>

        <!-- 歌手 tab -->
        <div v-else-if="tab === 'artists'">
          <TransitionGroup
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="opacity-0 translate-y-1"
          >
            <ArtistRow
              v-for="a in results.artists" :key="a.id"
              :id="a.id" :face="a.cover" :fallback="a.name.slice(0, 1)"
            >
              <template v-for="(seg, _si) in segments(a.name)" :key="_si">
                <span :class="seg.hit ? 'text-accent' : ''">{{ seg.text }}</span>
              </template>
            </ArtistRow>
            <p
              v-if="results[tab].length >= SEARCH_TYPE_LIMIT"
              class="py-4 text-center text-[11px] text-fg-muted"
            >
              {{ t('player.search_hint', { limit: SEARCH_TYPE_LIMIT }) }}
            </p>
          </TransitionGroup>
          <p v-if="!results.artists.length" class="py-16 text-center text-sm text-fg-muted">
            {{ t('player.search_no_artist') }}
          </p>
        </div>

        <!-- 专辑 tab -->
        <div v-else>
          <TransitionGroup
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="opacity-0 translate-y-1"
          >
            <div
              v-for="al in results.albums" :key="al.id"
              class="flex items-center gap-1.5 rounded-xl px-3 py-2.5 transition hover:bg-fg-primary/5"
            >
              <button
                class="flex min-w-0 flex-1 items-center gap-3 text-left"
                @click="router.push(`/album/${al.id}`)"
              >
                <div class="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-secondary ring-1 ring-fg-primary/5">
                  <img v-if="al.cover" :src="al.cover" alt="" class="h-full w-full object-cover" />
                  <svg v-else viewBox="0 0 24 24" class="m-auto mt-2.5 h-5 w-5 text-fg-muted" fill="currentColor">
                    <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 6.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5z" fill-rule="evenodd" />
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-fg-primary">
                    <template v-for="(seg, _si) in segments(al.title)" :key="_si">
                      <span :class="seg.hit ? 'text-accent' : ''">{{ seg.text }}</span>
                    </template>
                  </p>
                  <p v-if="al.track_count != null" class="mt-0.5 text-xs tabular-nums text-fg-muted">
                    {{ al.track_count }} {{ t('player.search_album_track') }}
                  </p>
                </div>
              </button>
              <EntityMenuButton
                :source="{ kind: 'album', id: al.id, title: al.title, cover: al.cover,
                          resolveTracks: () => resolveAlbumTracks(al.id) }"
              />
            </div>
            <p
              v-if="results[tab].length >= SEARCH_TYPE_LIMIT"
              class="py-4 text-center text-[11px] text-fg-muted"
            >
              {{ t('player.search_hint', { limit: SEARCH_TYPE_LIMIT }) }}
            </p>
          </TransitionGroup>
          <p v-if="!results.albums.length" class="py-16 text-center text-sm text-fg-muted">
            {{ t('player.search_no_album') }}
          </p>
        </div>
      </template>
    </main>
  </div>
</template>