<script setup lang="ts">
import PlayBox from '@/components/PlayBox.vue';
import EntityMenuHost from '@/components/EntityMenuHost.vue';
import ToastHost from '@/components/ToastHost.vue';
import PwaUpdateBanner from '@/components/PwaUpdateBanner.vue';
</script>

<template>
  <div class=" relative mx-auto w-full min-h-dvh antialiased bg-primary text-fg-primary">
    <div class=" fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div class=" absolute -top-40 left-1/2 h-[26rem] w-[140%] -translate-x-1/2 rounded-[100%] bg-accent/10 blur-3xl" />
      <div class=" absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
    </div>
    <div class=" relative z-10 min-h-dvh">
      <RouterView />
      <div class="  w-full h-28 pt-2 pb-6 text-center bg-dark/80 text-gray-400">This is the bottom.</div>
      <PlayBox />
      <EntityMenuHost />
      <ToastHost />
      <PwaUpdateBanner />
    </div>
  </div>
</template>
