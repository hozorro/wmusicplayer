<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AmbientBackground from "@/components/AmbientBackground.vue";
import TrackList from "@/components/TrackList.vue";
import { toPlayTrack } from "@/services/transform";
import { usePlayer } from "@/composables/playback";
import { usePlayerQueue } from "@/composables/player-queue";
import { useCollapseHeader } from "@/composables/collapse-header";

import { useI18n } from "vue-i18n";
import { getAlbum } from "@/apis/methods/music";
import { shuffled } from "@/utilies/general";
import defaultArt from '@/assets/imgs/album_art.jpg'

const { t } = useI18n()

const route = useRoute();
const router = useRouter();
const player = usePlayer();
const playQueue = usePlayerQueue();

const album = ref<AlbumInfo | null>(null)

const playTracks = computed(() => 
  album.value?.tracks.map(t => toPlayTrack(t,{
    album: album.value!.title,
    cover: album.value!.cover
  })) ?? [],
)

// —— 折叠页头：单一 collapse ref(0..1)驱动全部插值 ——
const { heroStyle, compactStyle, reset:resetCollapse } = useCollapseHeader({ range: 220 })

// —— artists 展开 / 收起 ——
const ARTIST_VISIBLE = 3
const artistExpanded = ref(false)
const visibleArtists = computed(() => {
  const all = album.value?.artists ?? []
  return artistExpanded.value ? all : all.slice(0, ARTIST_VISIBLE)
})
const hiddenCount = computed(() => Math.max(0, (album.value?.artists.length ?? 0) - ARTIST_VISIBLE))

watch(() => route.params.id, async id => {
  if (!id) return
  album.value = null
  artistExpanded.value = false
  resetCollapse()
  window.scrollTo({ top: 0, behavior: 'smooth' })
  album.value = await getAlbum(Number(id)).send()
}, { immediate: true })
</script>

<template>
  <div class=" min-h-dvh">
    <!-- 氛围背景：fixed 包裹，内容之下 -->
    <div class=" fixed inset-0 -z-10">
      <AmbientBackground :cover="album?.cover" />
    </div>

    <!-- 固定顶栏：返回键 + 折叠标题 -->
    <div class=" fixed inset-x-0 top-0 z-30 bg-gradient-to-b from-fg-primary/75 via-fg-primary/40 to-transparent pb-6 pt-[calc(env(safe-area-inset-top)+10px)]">
      <div class=" mx-auto flex max-w-2xl items-center gap-3 px-4">
        <button
          class=" shrink-0 rounded-full bg-primary/60 p-2 text-fg-secondary ring-1 ring-primary/10 backdrop-blur-sm transition hover:bg-primary/85 active:scale-90"
          aria-label="返回"
          @click="router.back()"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <h2 :style="compactStyle" class=" min-w-0 flex-1 truncate text-base font-bold text-fg-primary">
          {{ album?.title ?? '...' }}
        </h2>
      </div>
    </div>

    <!-- 内容 -->
    <main class=" mx-auto max-w-2xl px-4 pb-32 pt-[calc(env(safe-area-inset-top)+64px)]">
      <template v-if="album">
        <!-- hero：封面 + 标题 + artists + 动作（折叠时整体淡出） -->
        <header :style="heroStyle" class=" will-change-transform">
          <div class=" flex items-end gap-4">
            <div class=" h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-primary shadow-2xl shadow-primary/15 ring-1 ring-primary/10">
              <img v-if="album.cover" :src="album.cover" alt="" class=" h-full w-full object-cover" />
              <img v-else :src="defaultArt" alt="" class=" h-full w-full object-cover" />
            </div>
            <div class=" min-w-0 flex-1 pb-1">
              <p class=" text-[11px] font-semibold uppercase tracking-[0.2em] text-fg-muted">专辑</p>
              <h1 class=" mt-1 text-2xl font-extrabold leading-tight text-fg-primary">{{ album.title }}</h1>
            </div>
          </div>

          <!-- artists: 可展开 chips -->
          <div v-if="album.artists.length" class=" mt-4">
            <div
              class=" flex flex-wrap gap-2 overflow-hidden transition-[max-height] duration-300 ease-out"
              :class=" artistExpanded ? 'max-h-60' : 'max-h-8'"
            >
              <button
                v-for="a in visibleArtists"
                :key="a.id"
                class=" rounded-full bg-fg-primary/60 px-3 py-1.5 text-xs font-medium text-secondary ring-1 ring-primary/10 backdrop-blur-sm transition hover:bg-fg-primary/85 active:scale-95"
                @click="router.push(`/artist/${a.id}`)"
              >
                {{ a.name }}
              </button>
              <button
                v-if="hiddenCount > 0 && !artistExpanded"
                class=" rounded-full bg-fg-primary/5 px-3 py-1.5 text-xs font-medium text-fg-muted ring-1 ring-primary/10 transition hover:bg-fg-primary/10 active:scale-95"
                @click="artistExpanded = true"
              >
                +{{ hiddenCount }} more
              </button>
              <button
                v-if="hiddenCount > 0 && artistExpanded"
                class=" rounded-full bg-fg-primary/5 px-3 py-1.5 text-xs font-medium text-fg-muted ring-1 ring-primary/10 transition hover:bg-fg-primary/10 active:scale-95"
                @click="artistExpanded = false"
              >
                collapse
              </button>
            </div>
          </div>

          <!-- actions: 播放全部 / 随机播放 -->
          <div class=" mt-5 flex gap-2.5">
            <button
              class=" btn-primary"
              :disabled="playTracks.length === 0"
              @click="player.playAll(playTracks)"
            >
              {{ t('player.playall') }}
            </button>
            <button
              class=" btn-secondary"
              @click="playQueue.addMany(shuffled(playTracks))"
            >
              {{ t('player.randomplay') }}
            </button>
          </div>
        </header>

        <!-- 曲目列表 -->
        <h2 class=" pb-2 pt-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-fg-muted">
          曲目 <span class=" tabular-nums"> {{ playTracks.length }}</span>
        </h2>
        <TrackList :tracks="playTracks" :show-art="true" />
      </template>

      <!-- skeleton -->
      <div v-else class=" animate-pulse">
        <div class="flex items-end gap-4">
          <div class="h-28 w-28 rounded-xl bg-fg-primary/90 dark:bg-fg-primary/80" />
          <div class="flex-1 space-y-2.5 pb-1">
            <div class="h-3 w-10 rounded bg-fg-primary/90 dark:bg-fg-primary/80" />
            <div class="h-7 w-3/4 rounded bg-fg-primary/90 dark:bg-fg-primary/80" />
          </div>
        </div>
        <div class="mt-4 flex gap-2">
          <div class="h-7 w-20 rounded-full bg-fg-primary/90 dark:bg-fg-primary/80" />
          <div class="h-7 w-24 rounded-full bg-fg-primary/90 dark:bg-fg-primary/80" />
        </div>
        <div class="mt-6 flex gap-2.5">
          <div class="h-9 w-24 rounded-full bg-fg-primary/90 dark:bg-fg-primary/80" />
          <div class="h-9 w-28 rounded-full bg-fg-primary/90 dark:bg-fg-primary/80" />
        </div>
        <div class="mt-10 space-y-3">
          <div v-for="n in 8" :key="n" class="h-12 rounded-xl bg-fg-primary/70 dark:bg-fg-primary/50" />
        </div>
      </div>
    </main>
  </div>  
</template>