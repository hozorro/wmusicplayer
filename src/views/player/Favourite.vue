<script setup lang="ts">
/**
 * 我喜欢的音乐 —— P7.6.5：歌单形态的收藏曲目页
 * A52 折叠范式 + TrackList；收藏的唯一消费面
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import TrackList from '@/components/TrackList.vue'
import { useCollapseHeader } from '@/composables/collapse-header'
import { toPlayTrack } from '@/services/transform'
import { usePlayer } from '@/composables/playback'
import { usePlayerQueue } from '@/composables/player-queue'
import type { PlayTrack } from '@/player/types'
import favTracksCover from '@/assets/imgs/favorite.jpg';
import { getFavoriteTracks } from '@/apis/methods/music'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const player = usePlayer()
const playQueue = usePlayerQueue()
const { heroStyle, compactStyle, reset } = useCollapseHeader({ range: 160, parallax: 40 })

const tracks = ref<PlayTrack[] | null>(null)

watch(() => route.params.id, async () => {
  tracks.value = null
  reset()
  window.scrollTo({ top: 0 })
  const list = await getFavoriteTracks().send()
  tracks.value = list.map(t => toPlayTrack(t))
}, { immediate: true })

const loaded = computed(() => tracks.value !== null)
</script>

<template>
  <div class="min-h-dvh">
    <!-- 固定顶栏：返回 + 折叠标题 -->
    <div class="fixed inset-x-0 top-0 z-30 bg-gradient-to-b from-primary/60 via-primary/30 to-transparent pb-6 pt-[calc(env(safe-area-inset-top)+10px)]">
      <div class="mx-auto flex max-w-2xl items-center gap-3 px-4">
        <button
          class="shrink-0 rounded-full bg-primary/30 p-2 text-fg-primary ring-1 ring-fg-primary/10 transition hover:bg-primary/50 active:scale-90"
          :aria-label="t('common.back')"
          @click="router.back()"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <h2 :style="compactStyle" class="min-w-0 flex-1 truncate text-base font-bold text-fg-primary">
          {{ t('player.favorited_tracks') }}
        </h2>
      </div>
    </div>

    <!-- ═══ hero：收藏封面 + 动作 ═══ -->
    <header :style="heroStyle" class="will-change-transform">
      <div class="mx-auto max-w-2xl px-4 pb-5 pt-[calc(env(safe-area-inset-top)+64px)]">
        <div class="flex items-end gap-4">
          <div class="h-28 w-28 shrink-0 overflow-hidden rounded-xl shadow-2xl shadow-black/60 ring-1 ring-white/10">
            <img :src="favTracksCover" alt="" class="h-full w-full object-cover" />
          </div>
          <div class="min-w-0 flex-1 pb-1">
            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-fg-muted">{{ t('player.playlist') }}</p>
            <h1 class="mt-1 text-2xl font-extrabold leading-tight text-fg-primary">{{ t('player.favorited_tracks') }}</h1>
            <p v-if="loaded" class="mt-1.5 text-xs tabular-nums text-fg-muted">
              {{ tracks!.length }} {{ t('player.unit_track') }} · {{ t('player.fav_track_tip') }}
            </p>
          </div>
        </div>

        <div class="mt-5 flex gap-2.5">
          <button
            class=" btn-primary"
            :disabled="!tracks?.length"
            @click="player.playAll(tracks ?? [])"
          >
            {{ t('player.playall') }}
          </button>
          <button
            class=" btn-secondary"
            :disabled="!tracks?.length"
            @click="playQueue.addMany(tracks ?? [])"
          >
            {{ t('player.add_to_queue') }}
          </button>
        </div>
      </div>
    </header>

    <!-- ═══ 曲目列表 ═══ -->
    <main class="mx-auto max-w-2xl px-4 pb-32">
      <template v-if="loaded">
        <TrackList v-if="tracks!.length" :tracks="tracks!" :show-art="true" />
        <!-- 空态：引导收藏入口 -->
        <div v-else class="flex flex-col items-center gap-3 py-20 text-center">
          <svg viewBox="0 0 24 24" class="h-12 w-12 text-fg-primary" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
          <p class="text-sm text-fg-muted">{{ t('player.no_fav_track') }}</p>
          <p class="text-xs text-fg-secondary">{{ t('player.fav_track_hint') }}</p>
        </div>
      </template>

      <!-- 骨架 -->
      <div v-else class="animate-pulse space-y-3 pt-2">
        <div v-for="n in 8" :key="n" class="h-12 rounded-xl bg-secondary/50" />
      </div>
    </main>
  </div>
</template>