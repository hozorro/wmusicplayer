<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AmbientBackground from "@/components/AmbientBackground.vue";
import TrackList from "@/components/TrackList.vue";
import CollectionList from "@/components/CollectionList.vue";
import type { CollectionItem } from "@/player/menu/types";
import { toPlayTrack } from "@/services/transform";
import { usePlayer } from "@/composables/playback";
import { useCollapseHeader } from "@/composables/collapse-header";
import type { PlayTrack } from "@/player/types";
import { useI18n } from "vue-i18n";
import { getArtist, getCollectionTracks, getArtistRandomTracks, getFavoritedArtists } from "@/apis/methods/music";
import { toggleArtistFav } from "@/idb/app-api";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const player = usePlayer();

const artist = ref<ArtistInfo | null>(null)
const artistFav = ref(false)
const activeTab = ref<'tracks' | 'albums'>('tracks')

// ── 折叠页头：与 Album 同一插值模型（A52），视差量加大以匹配全出血 hero ──
const { heroStyle, compactStyle, reset:resetCollapse } = useCollapseHeader({ range: 260, parallax: 70 })

// 路由参数变化(艺人 -> 艺人)：watch immediately 覆盖首次载入与切换，复位全部状态
watch(() => route.params.id, async id => {
  if (!id) return
  artist.value = null
  activeTab.value = 'tracks'
  resetCollapse()
  window.scrollTo({ top: 0, behavior: 'smooth' })
  artist.value = await getArtist(Number(id)).send()
  const favArtists = await getFavoritedArtists().send()
  artistFav.value = favArtists.some(a => a.id === artist.value?.id)
}, { immediate: true })

// —— 派生数据 ——
const topTracks = computed<PlayTrack[]>(() =>
  artist.value?.top_tracks.map(t => toPlayTrack(t)) ?? []
)
const albumCount = computed(() => 
  (artist.value?.main_albums.length ?? 0) + (artist.value?.track_albums.length ?? 0)
)
const toAlbumItem = (a: Album) => ({
  id: a.id,
  title: a.title,
  cover: a.cover,
  subinfo: a.track_count !== undefined ? `${a.track_count} 首` : '',
  to: { name: 'album', params: { id: a.id } }
})
const mainAlbumItems = computed(() => artist.value?.main_albums.map(toAlbumItem) ?? [])
const trackAlbumItems = computed(() => artist.value?.track_albums.map(toAlbumItem) ?? [])

/** resolveTracks 端口接线：合集菜单的曲目解析 */
async function resolveAlbumTracks(c: CollectionItem): Promise<PlayTrack[]> {
  const detail = await getCollectionTracks(c.id, 'album').send()
  return detail.map(t => toPlayTrack(t, { album: c.title, cover: c.cover }))
}

async function playRandomTracks() {
  const tracks = await getArtistRandomTracks(artist.value!.id).send()
  player.playAll(tracks.map(t => toPlayTrack(t)))
}

async function toggleFavorite() {
  if (!artist.value) return
  const res = await toggleArtistFav(artist.value.id)
  if (res) artistFav.value = res.fav
}
</script>

<template>
  <div class="min-h-dvh">
    <!-- 氛围背景：以 portrait 为色源 -->
    <div class="fixed inset-0 -z-10">
      <AmbientBackground :cover="artist?.portrait" />
    </div>

    <!-- ═══ 固定顶栏：返回 + 折叠标题 ═══ -->
    <div class="fixed inset-x-0 top-0 z-30 bg-gradient-to-b from-fg-primary/75 via-fg-primary/40 to-transparent pb-6 pt-[calc(env(safe-area-inset-top)+10px)]">
      <div class="mx-auto flex max-w-2xl items-center gap-3 px-4">
        <button
          class="shrink-0 rounded-full bg-primary/60 p-2 text-fg-secondary ring-1 ring-primary/10 backdrop-blur-sm transition hover:bg-fg-primary/85 active:scale-90"
          aria-label="返回"
          @click="router.back()"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <h2 :style="compactStyle" class="min-w-0 flex-1 truncate text-base font-bold text-fg-primary">
          {{ artist?.name ?? '…' }}
        </h2>
      </div>
    </div>

    <template v-if="artist">
      <!-- ═══ hero：portrait 全出血 + 重叠信息卡 + 动作 ═══ -->
      <header :style="heroStyle" class="will-change-transform">
        <!-- portrait：全宽 2:1，桌面端限高防巨幅 -->
        <div class="relative aspect-[2/1] max-h-[420px] w-full overflow-hidden bg-primary">
          <img v-if="artist.portrait" :src="artist.portrait" alt="" class="h-full w-full object-cover" />
          <div v-else class="flex h-full items-center justify-center">
            <span class="text-7xl font-black uppercase text-fg-primary">{{ artist.pinyin_initial }}</span>
          </div>
          <!-- 底部渐变：为重叠卡托底 -->
          <div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-primary/70 via-primary/30 to-transparent" />
        </div>

        <div class="mx-auto max-w-2xl px-4">
          <!-- 重叠信息卡：-mt-12 没入 portrait 下缘 -->
          <div class="relative z-10 -mt-12 flex items-center gap-3.5 rounded-xl bg-primary/95 p-4 shadow-xl shadow-primary/10 ring-1 ring-primary/10 backdrop-blur-md">
            <div class="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-fg-primary ring-2 ring-fg-primary/10">
              <img v-if="artist.face" :src="artist.face" alt="" class="h-full w-full object-cover" />
              <span v-else class="flex h-full items-center justify-center text-lg font-bold uppercase text-fg-secondary">
                {{ artist.pinyin_initial }}
              </span>
            </div>
            <div class="min-w-0">
              <h1 class="truncate text-xl font-extrabold text-fg-primary">{{ artist.name }}</h1>
              <p class="mt-1 text-xs tabular-nums text-fg-secondary">
                {{ albumCount }} 张专辑 · {{ artist.track_count }} 首曲目
              </p>
            </div>
          </div>

          <!-- 动作区：作用于 top_tracks -->
          <div class="mt-4 flex gap-2.5">
            <button
              class="btn btn-primary"
              :disabled="topTracks.length === 0"
              @click="player.playAll(topTracks)"
            >
              {{ t('player.playall') }}
            </button>
            <button
              class="btn btn-secondary"
              :disabled="topTracks.length === 0"
              @click="playRandomTracks"
            >
              {{ t('player.randomplay') }}
            </button>
            <button
              class="flex h-9 w-9 items-center justify-center self-center rounded-full ring-1 transition active:scale-90"
              :class="artistFav
                ? 'bg-rose-400/15 text-rose-400 ring-rose-400/30'
                : 'text-fg-muted ring-fg-primary/20 hover:bg-primary/5'"
              :aria-label="artistFav ? '取消收藏艺人' : '收藏艺人'"
              @click="toggleFavorite"
            >
              <svg viewBox="0 0 24 24" class="h-4.5 w-4.5" :fill="artistFav ? 'currentColor' : 'none'"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <!-- ═══ 标签 + 内容区 ═══ -->
      <main class="mx-auto max-w-2xl px-4 pb-32 pt-6">
        <!-- 分段式标签 -->
        <div class="flex rounded-full bg-black/5 p-1 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
          <button
            v-for="tab in ([['tracks', 'Top 50'], ['albums', '专辑']] as const)"
            :key="tab[0]"
            class="flex-1 rounded-full py-1.5 text-sm font-medium transition"
            :class="activeTab === tab[0]
              ? 'bg-fg-primary text-primary shadow-sm'
              : 'text-fg-muted hover:text-fg-secondary'"
            @click="activeTab = tab[0]"
          >
            {{ tab[1] }}
          </button>
        </div>

        <Transition
          mode="out-in"
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-1"
          leave-active-class="transition duration-150 ease-in"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <!-- Top 50：序号即排名 -->
          <div v-if="activeTab === 'tracks'" key="tracks" class="pt-4">
            <TrackList v-if="topTracks.length" :tracks="topTracks" :show-art="false" />
            <p v-else class="py-16 text-center text-sm text-fg-muted">暂无曲目</p>
          </div>

          <!-- 专辑：主专辑 / 参与专辑，分隔呈现 -->
          <div v-else key="albums" class="pt-2">
            <template v-if="mainAlbumItems.length">
              <h3 class="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-fg-primary">
                主专辑
              </h3>
              <CollectionList kind="album" :collections="mainAlbumItems" :resolve-tracks="resolveAlbumTracks" />
            </template>

            <div v-if="mainAlbumItems.length && trackAlbumItems.length" class="mx-4 my-3 h-px bg-fg-primary/8" />

            <template v-if="trackAlbumItems.length">
              <h3 class="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-fg-secondary">
                参与的专辑
              </h3>
              <CollectionList kind="album" :collections="trackAlbumItems" :resolve-tracks="resolveAlbumTracks" />
            </template>

            <p v-if="!mainAlbumItems.length && !trackAlbumItems.length" class="py-16 text-center text-sm text-fg-muted">
              暂无专辑
            </p>
          </div>
        </Transition>
      </main>
    </template>

    <!-- skeleton -->
    <div v-else class="animate-pulse">
      <div class="aspect-[2/1] max-h-[420px] w-full bg-secondary/80" />
      <div class="mx-auto max-w-2xl px-4">
        <div class="-mt-12 flex items-center gap-3.5 rounded-xl bg-secondary/90 p-4">
          <div class="h-14 w-14 rounded-full bg-secondary/80" />
          <div class="space-y-2">
            <div class="h-5 w-32 rounded bg-secondary/80" />
            <div class="h-3 w-24 rounded bg-secondary/80" />
          </div>
        </div>
        <div class="mt-4 flex gap-2.5">
          <div class="h-9 w-24 rounded-full bg-secondary/90" />
          <div class="h-9 w-28 rounded-full bg-secondary/90" />
        </div>
        <div class="mt-6 h-9 rounded-full bg-secondary/80" />
        <div class="mt-6 space-y-3">
          <div v-for="n in 6" :key="n" class="h-12 rounded-xl bg-secondary/70" />
        </div>
      </div>
    </div>
  </div>
</template>