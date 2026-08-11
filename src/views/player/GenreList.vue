<script setup lang="ts">
/**
 * 流派列表页 —— 色块瓷砖墙
 * genre color 作砖底（创建时固定的偏亮色），深字 + 首字母水印
 */
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { readableTextColor, shade } from '@/utilies/palette';
import { useI18n } from 'vue-i18n';
import { getGenres } from '@/apis/methods/music';

const { t } = useI18n();

const router = useRouter();
const genres = ref<Genre[]>([]);

onMounted(async () => {
  genres.value = await getGenres().send();
});
</script>

<template>
  <div class="min-h-dvh">
    <!-- 粘性导航（standalone PWA 无浏览器返回手势，返回键必须常驻）-->
    <div class="sticky top-0 z-30 border-b border-fg-primary/5 bg-primary">
      <div class="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2.5 pt-[calc(env(safe-area-inset-top)+10px)]">
        <button
          class="rounded-full p-2 text-fg-secondary transition hover:bg-fg-primary/85 hover:text-fg-primary active:scale-90"
          aria-label="返回"
          @click="router.back()"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <h1 class="text-lg font-bold text-fg-primary">{{ t('player.genre') }}</h1>
      </div>
    </div>

    <main class="mx-auto max-w-2xl px-4 pb-32 pt-4">
      <!-- 瓷砖墙 -->
      <div v-if="genres.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <button
          v-for="g in genres"
          :key="g.id"
          class="group relative h-24 overflow-hidden rounded-xl text-left transition active:scale-[0.97] sm:h-28"
          :style="{ background: `linear-gradient(135deg, ${g.color} 0%, ${shade(g.color, -0.12)} 100%)` }"
          @click="router.push(`/genre/${g.id}`)"
        >
          <!-- 首字母水印 -->
          <span
            class="pointer-events-none absolute -right-2 -top-7 text-[92px] font-black leading-none opacity-[0.12]"
            :style="{ color: readableTextColor(g.color) }"
          >
            {{ g.name.slice(0, 1) }}
          </span>
          <div class="relative flex h-full flex-col justify-end p-3.5">
            <p
              class="text-lg font-extrabold leading-tight tracking-tight"
              :style="{ color: readableTextColor(g.color) }"
            >
              {{ g.name }}
            </p>
            <p
              v-if="g.track_count != null"
              class="mt-0.5 text-[11px] font-medium tabular-nums opacity-65"
              :style="{ color: readableTextColor(g.color) }"
            >
              {{ g.track_count }} 首
            </p>
          </div>
        </button>
      </div>

      <!-- 骨架 -->
      <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div v-for="n in 8" :key="n" class="h-24 animate-pulse rounded-xl bg-fg-primary/60 sm:h-28" />
      </div>
    </main>
  </div>
</template>