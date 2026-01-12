<script setup lang="ts">
import { onMounted } from 'vue';
import { useMusicStore } from './store/music';
import WMessage from './composables/message';

const musicStore = useMusicStore();
onMounted(async () => { 
  if (!('caches' in window)) return;

  const cache = await caches.open('pwa-state');
  const response = await cache.match('/__db_ready');
  const idbReady = response ? (await response.text()) == 'true' : false;
  if (!idbReady) {
    WMessage('未初始化本地数据库，不会产生播放记录。', 'warning');
  }
  musicStore.isIDBReady = idbReady
});
</script>

<template>
  <div class=" container bg-gray-100">
    <RouterView />
  </div>
</template>