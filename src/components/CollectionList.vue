<script setup lang="ts">
/**
 * 合集列表：点击 = 路由跳转；菜单操作经 resolveTracks 端口解析曲目
 */
import { useRouter } from 'vue-router'
import type { PlayTrack } from '@/player/types.ts'
import type { CollectionKind, CollectionItem } from '@/player/menu/types'
import EntityMenuButton from './EntityMenuButton.vue'

const props = defineProps<{ 
  kind: CollectionKind
  collections: CollectionItem[] 
  resolveTracks: (c: CollectionItem) => Promise<PlayTrack[]>
}>()

const router = useRouter()
</script>

<template>
  <div class=" px-2">
    <div
      v-for="c in collections"
      :key="c.id"
      class=" rounded-xl transition-colors hover:bg-white/5"
    >
      <div class=" flex items-center gap-3 px-3 py-2.5">
        <div class=" h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-white/5">
          <img v-if="c.cover" :src="c.cover" alt="" class=" h-full w-full object-cover" />
          <svg v-else viewBox="0 0 24 24" class="m-auto mt-3.5 h-5 w-5 text-zinc-600" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>

        <button class=" min-w-0 flex-1 py-0.5 text-left" @click="router.push(c.to)">
          <p class=" truncate text-sm font-medium text-zinc-100">{{ c.title }}</p>
          <p v-if="c.subinfo" class=" mt-0.5 truncate text-xs text-zinc-500">{{ c.subinfo }}</p>
        </button>

        <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0 text-zinc-600" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>

        <EntityMenuButton :source="{ kind: props.kind, id: c.id, title: c.title, cover: c.cover, resolveTracks: () => props.resolveTracks(c) }" />
      </div>
    </div>
  </div>
</template>