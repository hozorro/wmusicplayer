<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import PlayBox from '@/components/PlayBox.vue';
import EntityMenuHost from '@/components/EntityMenuHost.vue';
import ToastHost from '@/components/ToastHost.vue';
import PwaUpdateBanner from '@/components/PwaUpdateBanner.vue';
import { useMusicStore } from '@/store/music';

const musicStore = useMusicStore()

/** 每日一句按本地日期缓存：启动时取一次，PWA 常驻跨天则由回前台补一次 */
function ensureDailyLine() {
  if (document.visibilityState === 'visible') musicStore.ensureDailyLyric()
}

onMounted(() => {
  musicStore.ensureDailyLyric()
  document.addEventListener('visibilitychange', ensureDailyLine)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', ensureDailyLine)
})
</script>

<template>
  <div class=" relative mx-auto w-full min-h-dvh antialiased bg-primary text-fg-primary">
    <div class=" fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div class=" absolute -top-40 left-1/2 h-[26rem] w-[140%] -translate-x-1/2 rounded-[100%] bg-accent/10 blur-3xl" />
      <div class=" absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
    </div>
    <div class=" relative z-10 min-h-dvh">
      <RouterView />
      <div class="  w-full h-32 pt-2 pb-6 text-center bg-dark/80 text-gray-400">This is the bottom.</div>
      <PlayBox />
      <EntityMenuHost />
      <ToastHost />
      <PwaUpdateBanner />
    </div>
  </div>
</template>
