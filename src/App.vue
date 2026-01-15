<script setup lang="ts">
import { onMounted } from 'vue';
import { useMusicStore } from './store/music';
import WMessage from './composables/message';
import { t } from './utilies/use-i18n'

const musicStore = useMusicStore();
onMounted(async () => { 
  if (!('caches' in window)) return;

  const cache = await caches.open('pwa-state');
  const response = await cache.match('/__db_ready');
  const idbReady = response ? (await response.text()) == 'true' : false;
  if (!idbReady) {
    WMessage(t('errors.idb_not_ready'), 'warning');
  }
  musicStore.isIDBReady = idbReady
});
</script>

<template>
  <div class=" container bg-light dark:bg-dark text-gray-600 dark:text-teal-100">
    <RouterView />
  </div>
</template>