<script setup lang="ts">
import PlayBox from '@/components/PlayBox.vue';
import EntityMenuHost from '@/components/EntityMenuHost.vue';
</script>

<template>
  <div class=" relative mx-auto w-full min-h-svh antialiased bg-zinc-900">
    <RouterView />
    <div class="  w-full h-24 mt-4 text-center text-gray-400">This is the bottom.</div>
    <PlayBox />
    <EntityMenuHost />
  </div>
</template>