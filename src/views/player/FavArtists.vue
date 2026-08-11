<script setup lang="ts">
/**
 * 我喜欢的艺人 —— P7.6.5：ArtistRow 列表形态
 */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ArtistRow from '@/components/ArtistRow.vue'
import { getFavoritedArtists } from '@/apis/methods/music'

const router = useRouter()
const artists = ref<Artist[] | null>(null)

onMounted(async () => {
  artists.value = await getFavoritedArtists().send()
})
</script>

<template>
  <div class="min-h-dvh">
    <!-- 粘性导航 -->
    <div class="sticky top-0 z-30 border-b border-fg-primary/5 bg-primary">
      <div class="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2.5 pt-[calc(env(safe-area-inset-top)+10px)]">
        <button
          class="rounded-full p-2 text-fg-secondary transition hover:bg-fg-primary/8 hover:text-fg-primary active:scale-90"
          aria-label="返回"
          @click="router.back()"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <h1 class="min-w-0 flex-1 text-lg font-bold text-fg-primary">我喜欢的歌手</h1>
        <span v-if="artists?.length" class="text-xs tabular-nums text-fg-muted">
          {{ artists.length }} 位
        </span>
      </div>
    </div>

    <main class="mx-auto max-w-2xl px-2 pb-32 pt-2">
      <template v-if="artists">
        <div v-if="artists.length" class="space-y-1">
          <ArtistRow
            v-for="a in artists" :key="a.id"
            :id="a.id" :face="a.cover" :fallback="a.name.slice(0, 1)"
          >
            {{ a.name }}
          </ArtistRow>
        </div>
        <!-- 空态 -->
        <div v-else class="flex flex-col items-center gap-3 py-24 text-center">
          <svg viewBox="0 0 24 24" class="h-12 w-12 text-fg-secondary" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 12a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" />
            <path d="M3.5 21c.6-4.2 3.9-6.5 8.5-6.5s7.9 2.3 8.5 6.5" />
          </svg>
          <p class="text-sm text-fg-muted">还没有关注的歌手</p>
        </div>
      </template>

      <!-- 骨架 -->
      <div v-else class="space-y-2.5 px-2 pt-1">
        <div v-for="n in 6" :key="n" class="flex animate-pulse items-center gap-3 rounded-xl px-3 py-2.5">
          <div class="h-11 w-11 rounded-full bg-secondary/70" />
          <div class="h-4 w-1/3 rounded bg-secondary/70" />
        </div>
      </div>
    </main>
  </div>
</template>