<script setup lang="ts">
import PlayBox from '@/components/PlayBox.vue';
import EntityMenuHost from '@/components/EntityMenuHost.vue';
import ToastHost from '@/components/ToastHost.vue';
</script>

<template>
  <div class=" relative mx-auto w-full min-h-svh antialiased">
    <RouterView />
    <div class="  w-full h-28 pt-2 pb-6 text-center bg-dark/80 text-gray-400">This is the bottom.</div>
    <PlayBox />
    <EntityMenuHost />
    <ToastHost />
  </div>
</template>