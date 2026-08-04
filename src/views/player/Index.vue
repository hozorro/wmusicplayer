<script setup lang="ts">
/**
 * 首页 —— 播放器的入口和聚合面
 * 六模块并行取数据、模块级骨架、入场过渡随数据落点自然错开
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router';
import ModuleHeader from '@/components/ModuleHeader.vue';
import MediaCard from '@/components/MediaCard.vue';
import TrackCard from '@/components/TrackCard.vue';
import PagerDots from '@/components/PagerDots.vue'
import { useSnapPager } from '@/composables/snap-pager';
import { chunk } from '@/utilies/general';
import { readableTextColor, shade } from '@/utilies/palette';
import { toPlayTrack } from '@/services/transform';
import { paramlessModes, type RandomMode } from '@/services/random-model';
import ModeIcon from '@/components/ModeIcon.vue';
import { usePlayer } from '@/composables/playback';
import type { PlayTrack } from '@/player/types';
import favTracksCover from '@/assets/imgs/favorite.jpg';
import favArtistsCover from '@/assets/imgs/fav_artists.jpg';
import { getTopPlaylists, getTenArtists, getModedRandomTracks, 
        getRandomGenres, getLatestTracks, getHotTracks } from '@/apis/methods/music';

const router = useRouter();
const player = usePlayer()

// —— 问候：随时刻流转 ——
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 5 || hour > 23) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
})
const todayLine = computed(() => {
  return new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
})

// 模块数据：独立加载，互补阻塞
const playlists = ref<Playlist[]>([])
const playlistsLoaded = ref(false)
const artists = ref<Artist[]>([])
const artistsLoaded = ref(false)
const genres = ref<Genre[]>([])
const genresLoaded = ref(false)
const latestTracks = ref<PlayTrack[]>([])
const hotTracks = ref<PlayTrack[]>([])
const tracksLoaded = ref(false)

async function loadPlaylists() {
  try { playlists.value = await getTopPlaylists().send() }
  finally { playlistsLoaded.value = true }
}

async function loadArtists() {
  try { artists.value = await getTenArtists().send() }
  finally { artistsLoaded.value = true }
}

async function loadGenres() {
  try { genres.value = await getRandomGenres().send() }
  finally { genresLoaded.value = true }
}

async function loadTracks() {
  try { 
    const [latest, mostPlayed] = await Promise.all([
      getLatestTracks().send(),
      getHotTracks().send()
    ])
    latestTracks.value = latest.map(t => toPlayTrack(t))
    hotTracks.value = mostPlayed.map(t => toPlayTrack(t))
  }
  finally { tracksLoaded.value = true }
}

onMounted(() => {
  loadPlaylists()
  loadArtists()
  loadGenres()
  loadTracks()
})

// —— 最近添加 / 最常播放：tab + 2 x 2 snap 分页 ——
const trackTab = ref<'latest' | 'hot'>('latest')
const activeTracks = computed(() => trackTab.value === 'latest' ? latestTracks.value : hotTracks.value) 
const trackPages = computed(() => chunk(activeTracks.value, 4))
const { pager, activePage, onScroll, goTo } = useSnapPager()

watch(trackTab, async () => {
  await nextTick()
  pager.value?.scrollTo({ left: 0 })
  activePage.value = 0
})

function playFromTab(t: PlayTrack) {
  const idx = activeTracks.value.findIndex(track => track.id === t.id)
  if (idx !== -1) player.playTrack(activeTracks.value[idx])
}

// —— 随机播放：零参数模式直达 ——
const randomBusy = ref<string | null>(null)
async function playRandom(m: RandomMode) {
  if (randomBusy.value !== null) return
  randomBusy.value = m.key
  try { await getModedRandomTracks(m.key).send() }
  finally { randomBusy.value = null }
}
</script>

<template>
  <div class=" min-h-dvh">
    <!-- 氛围底色：顶部暖光晕 + 底部微光，衬于内容之下 -->
    <div class=" pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
      <div class=" absolute -top-40 left-1/2 h-[26rem] w-[140%] -translate-x-1/2 rounded-[100%] bg-amber-400/[0.06] blur-3xl" />
      <div class=" absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-orange-300/[0.04] blur-3xl" />
    </div>

    <!-- 粘性顶栏：假搜索框 + settings -->
    <div class=" sticky top-0 z-30 border-b border-white/5 bg-zinc-950/90 backdrop-blur-md">
      <div class=" mx-auto flex max-w-2xl items-center gap-3 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button
          class="group flex min-w-0 flex-1 items-center gap-2.5 rounded-full bg-white/[0.06] px-4 py-2.5 ring-1 ring-white/10 transition hover:bg-white/[0.09] hover:ring-white/20 active:scale-[0.98]"
          aria-label="搜索"
          @click="router.push('/search')"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0 text-zinc-500 transition group-hover:text-zinc-300"
               fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <span class="truncate text-sm text-zinc-500">搜索歌曲、歌手</span>
        </button>
        <button
          class="shrink-0 rounded-full p-2.5 text-zinc-400 transition hover:bg-white/8 hover:text-zinc-100 active:scale-90"
          aria-label="设置"
          @click="router.push('/settings')"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
    
    <main class=" mx-auto max-w-xl pb-32">
      <!-- 问候 -->
      <div class=" px-4 pt-6">
        <h1 class=" text-[26px] font-black tracking-tight text-zinc-50">{{ greeting }}</h1>
        <p class=" mt-1 text-xs text-zinc-500">{{ todayLine }}</p>
      </div>

      <!-- 歌单：favTracks 伪条目居首 -->
      <section>
        <ModuleHeader title="歌单" to="/playlists" />
        <Transition
          appear
          enter-active-class="transition duration-500 ease-out"
          enter-from-class="opacity-0 translate-y-2"
        >
          <div v-if="playlistsLoaded" class=" flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <MediaCard
              title="我最喜欢" subtitle="收藏的歌曲"
              :cover="favTracksCover" badge="heart" to="/favourite"
            />
            <MediaCard
              v-for="p in playlists" :key="p.id"
              :title="p.title"
              :subtitle="p.track_count != null ? `${p.track_count} 首` : ''"
              :cover="p.cover" :to="`/playlist/${p.id}`"
            />
          </div>
        </Transition>
        <div v-if="!playlistsLoaded" class=" flex animate-pulse gap-3 overflow-hidden px-4">
          <div v-for="n in 4" :key="n" class=" w-36 shrink-0">
            <div class=" aspect-square rounded-lg bg-zinc-800/70" />
            <div class=" mt-2 h-3.5 w-3/4 rounded bg-zinc-800/70" />
          </div>
        </div>
      </section>

      <!-- 随机播放：零参数模式直达 -->
      <section>
        <ModuleHeader title="随机播放" to="/random" />
        <div class=" flex gap-3 px-4">
          <button
            v-for="m in paramlessModes" :key="m.key"
            class="flex items-center gap-2.5 rounded-full bg-white/[0.05] py-2 pl-2.5 pr-4 ring-1 ring-white/10 transition hover:bg-white/[0.09] hover:ring-white/20 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
            :disabled="randomBusy !== null"
            @click="playRandom(m)"
          >
            <span class="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/15 text-amber-400">
              <span v-if="randomBusy === m.key" class="h-4 w-4 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
              <ModeIcon v-else :icon="m.icon" class=" h-4 w-4" />
            </span>
            <span class="text-sm font-semibold text-zinc-100">{{ m.name }}</span>
          </button>
        </div>
      </section>

      <!-- 艺人：favArtists 伪条目居尾 -->
      <section>
        <ModuleHeader title="艺人" to="/artists" />
        <Transition
          appear
          enter-active-class="transition duration-500 ease-out"
          enter-from-class="opacity-0 translate-y-2"
        >
          <div v-if="artistsLoaded" class=" flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <MediaCard
              v-for="a in artists" :key="a.id"
              :title="a.name"
              :cover="a.cover" :to="`/artist/${a.id}`"
            />
            <MediaCard
              title="我最喜欢" subtitle="收藏的歌手"
              :cover="favArtistsCover" badge="heart" to="/artist/favourite"
            />
          </div>
        </Transition>
        <div v-if="!artistsLoaded" class=" flex animate-pulse gap-3 overflow-hidden px-4">
          <div v-for="n in 4" :key="n" class=" w-36 shrink-0">
            <div class=" aspect-square rounded-lg bg-zinc-800/70" />
            <div class=" mt-2 h-3.5 w-3/4 rounded bg-zinc-800/70" />
          </div>
        </div>
      </section>

      <!-- 流派：8 块随机瓷砖横向成行 -->
      <section>
        <ModuleHeader title="流派" to="/genres" />
        <Transition
          appear
          enter-active-class="transition duration-500 ease-out"
          enter-from-class="opacity-0 translate-y-2"
        >
          <div v-if="genresLoaded" class=" flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              v-for="g in genres" :key="g.id"
              class="group relative h-20 w-32 shrink-0 overflow-hidden rounded-lg text-left transition active:scale-[0.96]"
              :style="{ background: `linear-gradient(135deg, ${g.color} 0%, ${shade(g.color, -0.12)} 100%)` }"
              @click="router.push(`/genre/${g.id}`)"
            >
              <span
                class="pointer-events-none absolute -right-1.5 -top-4 text-[64px] font-black leading-none opacity-[0.12]"
                :style="{ color: readableTextColor(g.color) }"
              >
                {{ g.name.slice(0, 1) }}
              </span>
              <p
                class="absolute inset-x-2.5 bottom-2 truncate text-sm font-extrabold tracking-tight"
                :style="{ color: readableTextColor(g.color) }"
              >
                {{ g.name }}
              </p>
            </button>
          </div>
        </Transition>
        <div v-if="!genresLoaded" class=" flex animate-pulse gap-3 overflow-hidden px-4">
          <div v-for="n in 4" :key="n" class=" h-20 w-32 shrink-0 rounded-lg bg-zinc-800/70" />
        </div>
      </section>

      <!-- 最近添加 / 最常播放：tab + 2 x 2 snap 分页 -->
      <section>
        <div class="flex items-center px-4 pb-3 pt-7">
          <div class="flex rounded-full bg-white/[0.05] p-1 ring-1 ring-white/10">
            <button
              v-for="tab in ([['latest', '最近添加'], ['hot', '最常播放']] as const)" :key="tab[0]"
              class="rounded-full px-3.5 py-1.5 text-xs font-semibold transition"
              :class="trackTab === tab[0]
                ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20'
                : 'text-zinc-400 hover:text-zinc-200'"
              @click="trackTab = tab[0]"
            >
              {{ tab[1] }}
            </button>
          </div>
        </div>

        <template v-if="tracksLoaded">
          <div
            v-if="trackPages.length"
            ref="pager"
            class="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            @scroll="onScroll"
          >
            <div
              v-for="(page, pi) in trackPages" :key="`${trackTab}-${pi}`"
              class="grid w-full shrink-0 snap-start grid-cols-2 gap-3"
            >
              <TrackCard v-for="t in page" :key="t.id" :track="t" @play="playFromTab(t)" />
            </div>
          </div>
          <PagerDots v-if="trackPages.length > 1" :count="trackPages.length" :active="activePage" @go="goTo" />
          <p v-else class="py-10 text-center text-sm text-zinc-500">暂无曲目</p>
        </template>
        <div v-else class="grid animate-pulse grid-cols-2 gap-3 px-4">
          <div v-for="n in 4" :key="n">
            <div class="aspect-square rounded-lg bg-zinc-800/70" />
            <div class="mt-2 h-3.5 w-4/5 rounded bg-zinc-800/70" />
            <div class="mt-1.5 h-3 w-1/2 rounded bg-zinc-800/70" />
          </div>
        </div>
      </section>

      <!-- 文件夹：仅标题入口 -->
      <section class="pb-2">
        <ModuleHeader title="文件夹" :to="`/folder/1`" />
      </section>
    </main>
  </div>
</template>