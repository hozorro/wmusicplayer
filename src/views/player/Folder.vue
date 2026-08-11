<script setup lang="ts">
/**
 * 文件夹页 —— P7.4 文件浏览器形态
 * 无 hero，面包屑尾锚定导航 + 子文件夹 / 曲目混排
 */
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import CollectionList from '@/components/CollectionList.vue';
import type { CollectionItem } from '@/player/menu/types';
import TrackList from '@/components/TrackList.vue';
import type { PlayTrack } from '@/player/types';
import { toPlayTrack } from '@/services/transform';
import { getFolder, getCollectionTracks } from '@/apis/methods/music';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const folder = ref<FolderInfo | null>(null);

// —— 路由参数变化（文件夹 -> 文件夹）：保留旧数据展示，新数据到达后整体替换，
// 避免切换期间标题回退到占位文案造成闪动
watch(() => route.params.id, async id => {
  if (!id) return
  const data = await getFolder(Number(id)).send()
  // 快速连续切换时丢弃过期响应，避免旧数据覆盖新数据
  if (route.params.id !== id) return
  folder.value = data
  window.scrollTo({ top: 0, behavior: 'smooth' })
}, { immediate: true })

// —— 面包屑：祖先链 + 当前级 ——
const crumbs = computed(() => {
  if (!folder.value) return []
  return [...folder.value.ancestors, { id: folder.value.id, name: folder.value.name }]
})

// 尾锚定：层级变化后平滑滚到当前屑
const crumbStrip = ref<HTMLElement>()
watch(folder, async () => {
  await nextTick()
  const el = crumbStrip.value
  if (el) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' })
})

// —— 派生数据 ——
const subfolderItems = computed<CollectionItem[]>(() => 
  folder.value?.subfolders.map(f => ({
    id: f.id,
    title: f.name,
    subinfo: [
      f.subfolder_count ? `${f.subfolder_count} 子文件夹` : null,
      f.track_count ? `${f.track_count} 首曲目` : null
    ].filter(Boolean).join(' · ') || undefined,
    to: { name: 'folder', params: { id: f.id } }
  })) ?? [],
)

const playTracks = computed<PlayTrack[]>(() => {
  if (!folder.value) return []
  return folder.value.tracks.map(t => toPlayTrack(t)) ?? []
})

async function resolveFolderTracks(c: CollectionItem): Promise<PlayTrack[]> {
  const tracks = await getCollectionTracks(c.id, 'folder').send()
  return tracks.map(t => toPlayTrack(t))
}
</script>

<template>
  <div class=" min-h-svh">
    <!-- 粘性头部：导航栏 + 面包屑 -->
    <div class=" sticky top-0 z-30 border-b border-fg-primary/5 bg-primary">
      <!-- 导航栏 -->
      <div class=" mx-auto flex max-w-2xl items-center gap-3 px-4 pb-1.5 pt-[calc(env(safe-area-inset-top)+10px)]">
        <button
          class=" shrink-0 rounded-full p-2 text-fg-secondary transition hover:bg-fg-primary/8 hover:text-fg-primary active:scale-90"
          aria-label="返回"
          @click="router.push('/')"
        >
          <span class=" icon-[solar--alt-arrow-left-linear]"></span>
        </button>
        <h1 class=" min-w-0 flex-1 truncate text-lg font-bold text-fg-primary">
          {{ folder?.name ?? t('player.folder') }}
        </h1>
      </div>

      <!-- 面包屑：横向滚动 + 尾锚定 + 单屑截断 -->
      <nav
        ref="crumbStrip"
        aria-label="文件夹路径"
        class=" mx-auto flex max-w-2xl items-center gap-1 overflow-x-auto px-4 pb-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <template v-if="crumbs.length">
          <template v-for="(c, i) in crumbs" :key="c.id">
            <button
              v-if="i < crumbs.length - 1"
              class=" max-w-[45vw] shrink-0 truncate rounded-md px-1.5 py-1 text-[13px] text-fg-muted transition hover:bg-fg-primary/5 hover:text-fg-primary active:scale-95"
              @click="() => router.push({ name: 'folder', params: { id: c.id } })"
            >
              {{ c.name }}
            </button>
            <span
              v-else
              class=" max-w-[60vw] shrink-0 truncate px-1.5 py-1 text-[13px] font-semibold text-fg-primary"
            >
              {{ c.name }}
            </span>
            <svg
              v-if="i < crumbs.length - 1"
              viewBox="0 0 24 24"
              class="h-3 w-3 shrink-0 text-fg-muted"
              fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </template>
        </template>
        <!-- 面包屑骨架 -->
        <div v-else class="flex animate-pulse gap-2">
          <div class="h-5 w-14 rounded bg-secondary/80" />
          <div class="h-5 w-20 rounded bg-secondary/80" />
          <div class="h-5 w-16 rounded bg-secondary/80" />
        </div>
      </nav>
    </div>

    <!-- 内容：子文件夹 + 曲目 -->
    <main class=" mx-auto max-w-2xl px-4 pb-32 pt-3">
      <template v-if="folder">
        <template v-if="subfolderItems.length">
          <h2 class=" px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-fg-muted">
            子文件夹 <span class=" tabular-nums">· {{ subfolderItems.length }}</span>
          </h2>
          <CollectionList kind="folder" :collections="subfolderItems" :resolve-tracks="resolveFolderTracks" />
        </template>

        <div v-if="subfolderItems.length && playTracks.length" class=" mx-4 my-3 h-px bg-white/8"></div>

        <template v-if=" playTracks.length">
          <h2 class=" px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-fg-muted">
            曲目 <span class=" tabular-nums">· {{ playTracks.length }}</span>
          </h2>
          <TrackList :tracks="playTracks" :show-art="false"></TrackList>
        </template>

        <p v-if="!subfolderItems.length && !playTracks.length" class=" py-16 text-center text-sm text-fg-muted">
          空文件夹
        </p>
      </template>

      <!-- 骨架：文件夹形 + 曲目形混排 -->
      <div v-else class="animate-pulse space-y-2.5 pt-1">
        <div v-for="n in 2" :key="`f${n}`" class="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
          <div class="h-12 w-12 rounded-lg bg-secondary/70" />
          <div class="h-4 w-2/5 rounded bg-secondary/70" />
        </div>
        <div class="mx-4 my-3 h-px bg-white/5" />
        <div v-for="n in 6" :key="`t${n}`" class="h-12 rounded-xl bg-secondary/50" />
      </div>
    </main>
  </div>
</template>