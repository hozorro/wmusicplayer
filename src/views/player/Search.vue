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
import { getConfig } from '@/config/config-provider'
import { getCollectionTracks, searchLibrary, searchLyric } from '@/apis/methods/music'
import { snippetParts } from '@/utilies/lyric-snippet'

// import { searchLibrary } from '@/api/…'

const router = useRouter()
const player = usePlayer()
const { t } = useI18n()
const config = getConfig()

type TabKey = 'tracks' | 'artists' | 'albums' | 'lyrics'

const input = ref<HTMLInputElement>()
const q = ref('')
const tab = ref<TabKey>('tracks')
const results = ref<SearchResults>({ tracks: [], artists: [], albums: [] })
const searching = ref(false)
const searched = ref(false)
let searchSeq = 0

// —— 歌词搜索：独立于本地曲库，懒加载（点击歌词 tab 才发请求）——
const lyricItems = ref<LyricSearchItem[]>([])
const lyricTotal = ref(0)
const lyricSearching = ref(false)
const lyricLoaded = ref(false)
const lyricQuery = ref('')        // 当前结果对应的关键词，用于判断是否需要重查
let lyricSeq = 0

onMounted(() => input.value?.focus())

const playTracks = computed(() => results.value.tracks.map(t => toPlayTrack(t)))
const isCurrent = (id: number) => player.curTrack.value?.id === id

// ── 防抖 + 竞态守卫 ──
watch(q, async () => {
  const query = q.value.trim()
  await new Promise(r => setTimeout(r, 120))       // 防抖窗口
  if (query !== q.value.trim()) return             // 窗口内已有新输入
  if (!query) {
    results.value = { tracks: [], artists: [], albums: [] }
    searched.value = false
    searching.value = false
    resetLyricSearch()
    return
  }
  runSearch(query)
  // 已停在歌词 tab 时关键词变了，必须跟着重查，否则显示的是上一个词的结果
  if (tab.value === 'lyrics') runLyricSearch(query)
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
    // 歌词是懒加载的独立数据源，不参与偏向，否则会绕过“点击才请求”的约定
    const TAB_PRIORITY = ['tracks', 'artists', 'albums'] as const
    if (tab.value !== 'lyrics' && !r[tab.value].length) {
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

// ── 歌词搜索：懒加载 + 独立竞态守卫 ──
async function runLyricSearch(query: string) {
  const keyword = query.trim()
  if (!keyword) return
  const seq = ++lyricSeq
  lyricSearching.value = true
  try {
    const r = await searchLyric(keyword).send()
    if (seq !== lyricSeq) return
    lyricItems.value = r.items
    lyricTotal.value = r.total
    lyricQuery.value = keyword
    lyricLoaded.value = true
  } catch {
    if (seq === lyricSeq) lyricLoaded.value = false
  } finally {
    if (seq === lyricSeq) lyricSearching.value = false
  }
}

function resetLyricSearch() {
  lyricSeq++
  lyricItems.value = []
  lyricTotal.value = 0
  lyricLoaded.value = false
  lyricQuery.value = ''
  lyricSearching.value = false
}

/** 切 tab：首次点歌词、或关键词已变时才真正发请求 */
function selectTab(key: TabKey) {
  tab.value = key
  if (key !== 'lyrics') return
  const keyword = q.value.trim()
  if (!keyword) return
  if (lyricLoaded.value && lyricQuery.value === keyword) return
  runLyricSearch(keyword)
}

/** 歌词结果 -> 可播放曲目（后端已给足字段，无需再查库） */
function lyricItemToTrack(item: LyricSearchItem): Track {
  return {
    id: item.track_id,
    title: item.title,
    duration: item.duration,
    album: item.album ? { id: item.album_id ?? 0, title: item.album } : undefined,
    artists: item.artists.map(name => ({ id: 0, name })),
    cover_art_hash: item.cover_art_hash ?? undefined,
  }
}

const lyricRows = computed(() => lyricItems.value.map(item => ({
  item,
  track: toPlayTrack(lyricItemToTrack(item)),
})))

function playLyricRow(index: number) {
  player.playAll(lyricRows.value.map(row => row.track), index)
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

const tabs = computed(() => {
  const entityTabs = [
    { key: 'tracks' as const, label: t('player.track'), count: results.value.tracks.length },
    { key: 'artists' as const, label: t('player.artist'), count: results.value.artists.length },
    { key: 'albums' as const, label: t('player.album'), count: results.value.albums.length },
  ].map(tab => ({
    ...tab,
    showCount: true,
    capped: tab.count >= config.SEARCH_TYPE_LIMIT,
  }))
  // 歌词结果懒加载：未点击前不显示计数，避免被误解为 0 条
  return [...entityTabs, {
    key: 'lyrics' as const,
    label: t('player.lyric'),
    count: lyricTotal.value,
    showCount: lyricLoaded.value,
    // 歌词接口返回真实总数，不受本地 idb 截断限制，不需要 "+"
    capped: false,
  }]
})
</script>

<template>
  <div class="min-h-dvh">
    <!-- ═══ 粘性头部：返回 + 搜索输入 + tabs ═══ -->
    <div class="sticky top-0 z-30 border-b border-fg-primary/5 backdrop-blur-md">
      <div class="mx-auto flex max-w-2xl items-center gap-2.5 pl-2 pr-4 py-2.5 pt-[calc(env(safe-area-inset-top)+10px)]">
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
            v-for="entry in tabs" :key="entry.key"
            class="rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95"
            :class="tab === entry.key
              ? 'bg-accent text-primary shadow-md shadow-accent/20'
              : 'bg-fg-primary/5 text-fg-muted ring-1 ring-fg-primary/10 hover:text-fg-secondary'"
            @click="selectTab(entry.key)"
          >
            {{ entry.label }}<template v-if="entry.showCount"> · {{ entry.capped ? `${entry.count}+` : entry.count }}</template>
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
              v-if="results[tab].length >= config.SEARCH_TYPE_LIMIT"
              class="py-4 text-center text-[11px] text-fg-muted"
            >
              {{ t('player.search_hint', { limit: config.SEARCH_TYPE_LIMIT }) }}
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
              v-if="results[tab].length >= config.SEARCH_TYPE_LIMIT"
              class="py-4 text-center text-[11px] text-fg-muted"
            >
              {{ t('player.search_hint', { limit: config.SEARCH_TYPE_LIMIT }) }}
            </p>
          </TransitionGroup>
          <p v-if="!results.artists.length" class="py-16 text-center text-sm text-fg-muted">
            {{ t('player.search_no_artist') }}
          </p>
        </div>

        <!-- 专辑 tab -->
        <div v-else-if="tab === 'albums'">
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
              v-if="results[tab].length >= config.SEARCH_TYPE_LIMIT"
              class="py-4 text-center text-[11px] text-fg-muted"
            >
              {{ t('player.search_hint', { limit: config.SEARCH_TYPE_LIMIT }) }}
            </p>
          </TransitionGroup>
          <p v-if="!results.albums.length" class="py-16 text-center text-sm text-fg-muted">
            {{ t('player.search_no_album') }}
          </p>
        </div>

        <!-- 歌词 tab：懒加载，首次点击才请求后端 -->
        <div v-else>
          <div v-if="lyricSearching" class="flex items-center justify-center gap-2 py-16 text-sm text-fg-muted">
            <span class="h-4 w-4 animate-spin rounded-full border-2 border-fg-secondary border-t-accent" />
            {{ t('player.lyric_searching') }}
          </div>
          <template v-else>
            <TransitionGroup
              enter-active-class="transition duration-300 ease-out"
              enter-from-class="opacity-0 translate-y-1"
            >
              <div
                v-for="(row, i) in lyricRows" :key="row.item.lyric_id"
                class="flex items-start gap-1.5 rounded-xl px-3 py-2.5 transition hover:bg-fg-primary/5"
                :class="isCurrent(row.track.id) ? 'bg-accent text-primary' : ''"
              >
                <button class="flex min-w-0 flex-1 items-start gap-3 text-left" @click="playLyricRow(i)">
                  <div class="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-secondary ring-1 ring-white/5">
                    <img v-if="row.track.cover" :src="row.track.cover" alt="" class="h-full w-full object-cover" />
                    <svg v-else viewBox="0 0 24 24" class="m-auto mt-2.5 h-5 w-5 text-fg-muted" fill="currentColor">
                      <path d="M9 18V6l10-2v11.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                      <circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="15.5" r="2.5" />
                    </svg>
                    <span v-if="isCurrent(row.track.id)" class="absolute bottom-0.5 left-0.5 rounded bg-primary/55 p-1">
                      <NowPlayingIndicator :playing="player.isPlaying.value" class="origin-bottom-left scale-[0.55]" />
                    </span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm" :class="isCurrent(row.track.id) ? 'font-semibold text-accent' : 'font-medium text-fg-primary'">
                      {{ row.track.title }}
                    </p>
                    <p class="mt-0.5 truncate text-[11px] text-fg-muted">
                      {{ row.item.artists.join(' / ') }}<template v-if="row.item.album"> · {{ row.item.album }}</template>
                    </p>
                    <p
                      v-for="(snip, si) in row.item.snippets" :key="si"
                      class="mt-1 line-clamp-1 text-xs leading-relaxed text-fg-secondary"
                    >
                      <template v-for="(part, _pi) in snippetParts(snip)" :key="_pi">
                        <span :class="part.hit && !isCurrent(row.track.id) ? 'font-semibold text-accent' : ''">{{ part.text }}</span>
                      </template>
                    </p>
                  </div>
                </button>
              </div>
              <p
                v-if="lyricTotal > lyricItems.length"
                class="py-4 text-center text-[11px] text-fg-muted"
              >
                {{ t('player.search_hint', { limit: config.SEARCH_TYPE_LIMIT }) }}
              </p>
            </TransitionGroup>
            <p v-if="lyricLoaded && !lyricItems.length" class="py-16 text-center text-sm text-fg-muted">
              {{ t('player.search_no_lyric') }}
            </p>
          </template>
        </div>
      </template>
    </main>
  </div>
</template>