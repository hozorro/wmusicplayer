<script setup lang="ts">
import { onMounted } from 'vue';
import { useMusicStore } from '@/store/music';

const store = useMusicStore();
onMounted(() => {
  store.playerBoxShow = false
});
</script>

<template>
  <RouterView />
</template>