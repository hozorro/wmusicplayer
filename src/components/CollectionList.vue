<script setup lang="ts">
/**
 * 合集列表：点击 = 路由跳转；菜单操作经 resolveTracks 端口解析曲目
 */
import { useRouter } from 'vue-router'
import type { PlayTrack } from '@/player/types.ts'
import type { CollectionKind, CollectionItem } from '@/player/menu/types'
import EntityMenuButton from './EntityMenuButton.vue'
import { useMusicStore } from '@/store/music.ts'

const props = defineProps<{ 
  kind: CollectionKind
  collections: CollectionItem[] 
  resolveTracks: (c: CollectionItem) => Promise<PlayTrack[]>
}>()

const router = useRouter()
const musicStore = useMusicStore()

function handlePush(c: CollectionItem) {
  if (c.to instanceof Object && (c.to as { name: string, params: { id: string } }).name === 'album') {
    musicStore.setArtistPageTab('albums')
  }
  router.push(c.to)
}
</script>

<template>
  <div class=" px-2">
    <div
      v-for="c in collections"
      :key="c.id"
      class=" rounded-xl transition-colors hover:bg-white/5"
    >
      <div class=" flex items-center gap-3 px-3 py-2.5">
        <div class=" h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary ring-1 ring-fg-primary/10">
          <!-- 有无 artwork 统一以 cover 判据：数据层保证无图时 cover 为空串，
               与实体无关（artist 的 face/portrait、genre 静态封面均兼容） -->
          <img v-if="c.cover" :src="c.cover" alt="" class=" h-full w-full object-cover" />
          <svg v-else-if="props.kind == 'folder'" viewBox="0 0 24 24" class="m-auto mt-1.5 h-9 w-9 text-fg-muted" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M3 6C3 4.89543 3.89543 4 5 4H9L11 6H19C20.1046 6 21 6.89543 21 8V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            <path d="M14 10V15M14 15C14 16.1046 13.1046 17 12 17C10.8954 17 10 16.1046 10 15C10 13.8954 10.8954 13 12 13C13.1046 13 14 13.8954 14 15ZM14 10L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" class="m-auto mt-2.5 h-7 w-7 text-fg-muted" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>

        <button class=" min-w-0 flex-1 py-0.5 text-left" @click="handlePush(c)">
          <p class=" truncate text-sm font-medium text-fg-primary">{{ c.title }}</p>
          <p v-if="c.subinfo" class=" mt-0.5 truncate text-xs text-fg-muted">{{ c.subinfo }}</p>
        </button>

        <EntityMenuButton :source="{ kind: props.kind, id: c.id, title: c.title, cover: c.cover, resolveTracks: () => props.resolveTracks(c) }" />
      </div>
    </div>
  </div>
</template>