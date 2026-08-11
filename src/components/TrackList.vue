<script setup lang="ts">
/**
 * 曲目列表：点击 = 列表上下文播放（playAll(tracks, i)）
 */
import { usePlayer } from '@/composables/playback'
import type { MenuSource } from '@/player/menu/types'
import type { PlayTrack } from '@/player/types'
import TrackRow from './TrackRow.vue';

const props = defineProps<{ 
  tracks: PlayTrack[], 
  showArt: boolean,
  menuSource?: (t: PlayTrack) => MenuSource 
}>()

const player = usePlayer()
const isCurrent = (t: Track) => t.id === player.currentTrack.value?.id
</script>

<template>
  <div class=" px-2">
    <div
      v-for="(t, i) in tracks"
      :key="t.id"
      class=" rounded-xl transition-colors"
      :class="isCurrent(t) ? 'bg-accent/10' : 'hover:bg-white/5'"
    >
      <TrackRow :track="t" :order-no="i + 1" :show-art="showArt" :menu-source="menuSource" />
    </div>
  </div>
</template>