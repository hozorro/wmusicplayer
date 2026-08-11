<script setup lang="ts">
import { computed } from 'vue'
import NowPlayingIndicator from '@/components/NowPlayingIndicator.vue'
import { usePlayer } from '@/composables/playback'
import type { PlayTrack } from '@/player/types'

const props = defineProps<{ track: PlayTrack }>()
defineEmits<{ play: [] }>()

const player = usePlayer()
const isCurrent = computed(() => player.currentTrack.value?.id === props.track.id)
</script>

<template>
  <button class="group min-w-0 text-left" @click="$emit('play')">
    <div class="relative aspect-square overflow-hidden rounded-lg bg-secondary ring-1 ring-fg-primary/5 transition duration-200 group-hover:ring-fg-primary/15 group-active:scale-[0.96]">
      <img
        v-if="track.cover"
        :src="track.cover"
        alt=""
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <svg v-else viewBox="0 0 24 24" class="m-auto mt-[32%] h-9 w-9 text-fg-muted" fill="currentColor">
        <path d="M9 18V6l10-2v11.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="15.5" r="2.5" />
      </svg>
      <!-- 当前曲目角标：频谱条随播放态跳动/冻结 -->
      <span
        v-if="isCurrent"
        class="absolute bottom-1.5 left-1.5 flex h-6 items-end justify-center rounded-md bg-primary/55 px-1.5 pb-1 pt-1.5"
      >
        <NowPlayingIndicator :playing="player.isPlaying.value" class="origin-bottom scale-75" />
      </span>
    </div>
    <p
      class="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug"
      :class="isCurrent ? 'text-accent' : 'text-zinc-100'"
    >
      {{ track.title }}
    </p>
    <p class="mt-0.5 truncate text-xs text-fg-muted">{{ track.artists?.map(a => a.name).join(', ') }}</p>
  </button>
</template>