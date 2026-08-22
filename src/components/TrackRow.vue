<script setup lang="ts">
/**
 * 曲目条目，用于显示曲目信息
 */
import { usePlayer } from '@/composables/playback'
import { formatTime } from '@/utilies/general';
import NowPlayingIndicator from './NowPlayingIndicator.vue';
import EntityMenuButton from './EntityMenuButton.vue';
import type { PlayTrack } from '@/player/types';
import type { MenuSource } from '@/player/menu/types.ts';

interface RowProps {
  track: PlayTrack
  showArt?: boolean;
  orderNo?: number;
  menuSource?: (t: PlayTrack) => MenuSource
}

const props = defineProps<RowProps>()

const player = usePlayer()

const isCurrent = (t: PlayTrack) => t.id === player.currentTrack.value?.id
const playTrack = (t: PlayTrack) => player.playTrack(t)
</script>

<template>
  <div
    class=" rounded-xl transition-colors"
    :class="isCurrent(track) ? 'bg-accent/10' : 'hover:bg-white/5'"
  >
    <div class=" flex items-center gap-2 px-2 py-0.5">
      <div class=" shrink-0">
        <div v-if="showArt" class=" h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-secondary">
          <img v-if="track?.cover" :src="track.cover" alt="" class=" h-full w-full object-cover" />
          <svg v-else viewBox="0 0 24 24" class="m-auto mt-3 h-5 w-5 text-fg-muted" fill="currentColor">
            <path d="M9 18V6l10-2v11.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="15.5" r="2.5" />
          </svg>
        </div>
        <div v-else class=" h-11 w-4 text-center">
          <span class=" text-xs tabular-nums text-fg-secondary">{{ orderNo || '-' }}</span>
        </div>
      </div>
      <div v-if="isCurrent(track)" class=" flex w-6 shrink-0 items-center justify-center">
        <NowPlayingIndicator :playing="player.isPlaying.value" />
      </div>
      <button class=" min-w-0 flex-1 py-0.5 text-left" @click="playTrack(track)">
        <p class=" truncate text-sm" :class="isCurrent(track) ? 'font-semibold text-accent' : 'font-medium text-fg-primary'">
          {{ track.title }}
        </p>
        <p class=" mt-0.5 truncate text-xs text-fg-secondary">
          {{ track.artists?.map(a => a.name).join(', ') }}
        </p>
      </button>
      
      <span v-if="track.duration" class=" shrink-0 text-xs tabular-nums text-fg-secondary">
        {{ formatTime(track.duration) }}
      </span>

      <EntityMenuButton :source="props.menuSource?.(track) ?? { kind: 'track', track }" />
    </div>
  </div>
</template>