<script setup lang="ts">
/**
 * 艺人列表 —— 字母索引选择器
 * 粘性头部（导航 + 27 格字母快）常驻；列表随字母切换，取数带竞态守卫
 */
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useRequest } from 'alova/client';
import ArtistRow from '@/components/ArtistRow.vue';
import { getArtistChars, getArtists } from '@/apis/methods/music';

interface CharInfo { charName: string; hasArtist: boolean; }

const { t } = useI18n();

const router = useRouter();
let selectedChar = ref('')
const chars = ref<CharInfo[]>([]);
let fetchSeq = 0

onMounted(async () => {
  chars.value = (await getArtistChars().send());
  const first = chars.value.find(c => c.hasArtist);
  if (first) {
    selectedChar.value = first.charName;
    getArtistList(first.charName);
  }
})

const { loading, data:artists, send:getArtistList } = useRequest((archar) => getArtists(archar),{
  immediate: false,
  initialData: {artists:[]}
});

async function switchArtists(char: string) { 
  const info = chars.value.find(c => c.charName == char)
  if (!info?.hasArtist || selectedChar.value === char) return
  selectedChar.value = char
  artists.value = []
  const seq = ++fetchSeq
  const list = await getArtistList(char)
  if (seq != fetchSeq) return   // 过期响应丢弃
  artists.value = list
}

function charClass(c: CharInfo):string {
  if (!c.hasArtist) return 'pointer-events-none text-fg-muted'
  if (c.charName === selectedChar.value) return 'bg-accent font-bold text-fg-primary'
  return 'text-fg-secondary hover:bg-white/8 active:bg-white/15'
}
</script>

<template>
  <div class="min-h-dvh">
    <!-- ═══ 粘性头部：导航栏 + 字母块 ═══ -->
    <div class="sticky top-0 z-30 border-b border-white/5 bg-card">
      <!-- 导航栏 -->
      <div class="mx-auto flex max-w-2xl items-center gap-2 pl-2 pr-4 pb-2 pt-[calc(env(safe-area-inset-top)+10px)]">
        <button
          class="rounded-full p-2 text-zinc-300 transition hover:bg-white/8 hover:text-zinc-50 active:scale-90"
          :aria-label="t('common.back')"
          @click="router.back()"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <h1 class="text-lg font-bold text-zinc-50">{{ t('player.artist') }}</h1>
      </div>

      <!-- 字母块：27 格 = 9 列 × 3 行 -->
      <div class="mx-auto max-w-2xl px-4 pb-3">
        <div v-if="chars.length" class="grid grid-cols-9 gap-1.5">
          <button
            v-for="c in chars"
            :key="c.charName"
            class="rounded-md py-2 text-center text-[13px] font-medium transition"
            :class="charClass(c)"
            @click="switchArtists(c.charName)"
          >
            {{ c.charName }}
          </button>
        </div>
        <!-- 字母块骨架 -->
        <div v-else class="grid grid-cols-9 gap-1.5">
          <div v-for="n in 27" :key="n" class="animate-pulse rounded-md bg-secondary/70 py-2" />
        </div>
      </div>
    </div>

    <!-- ═══ 艺人列表 ═══ -->
    <main class="mx-auto max-w-2xl px-4 pb-32 pt-3">
      <!-- 当前字母 + 计数 -->
      <p
        v-if="selectedChar && !loading"
        class="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-fg-muted"
      >
        {{ selectedChar === '_' ? t('common.others') : selectedChar }}
        <span class="tabular-nums">· {{ t('player.char_stat', { artist_count: artists.length }) }}</span>
      </p>

      <!-- 加载骨架 -->
      <div v-if="loading" class="space-y-2.5 pt-1">
        <div v-for="n in 6" :key="n" class="flex animate-pulse items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
          <div class="h-11 w-11 rounded-full bg-secondary/70" />
          <div class="h-4 w-1/3 rounded bg-secondary/70" />
        </div>
      </div>

      <!-- 列表 -->
      <div v-else-if="artists.length" class="space-y-1">
        <ArtistRow v-for="a in artists" :key="a.id" :id="a.id" :face="a.cover" :fallback="a.name.slice(0, 1)">
          {{ a.name }}
        </ArtistRow>
      </div>

      <!-- 空态 -->
      <p v-else class="py-16 text-center text-sm text-fg-muted">{{ t('player.no_artists') }}</p>
    </main>
  </div>
</template>