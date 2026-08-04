<script setup lang="ts">
/** 频谱条 */
defineProps<{ playing: boolean}>()
</script>

<template>
  <div class=" flex h-3.5 items-end gap-[3px]">
    <span class="w-[3px] rounded-sm bg-amber-400 animate-bounce [animation-delay:-0.32s] [animation-duration:0.8s]" :class="playing ? '' : '[animation-play-state:paused]'" style="height: 55%" />
    <span class="w-[3px] rounded-sm bg-amber-400 animate-bounce [animation-delay:-0.16s] [animation-duration:1s]" :class="playing ? '' : '[animation-play-state:paused]'" style="height: 100%" />
    <span class="w-[3px] rounded-sm bg-amber-400 animate-bounce [animation-duration:0.9s]" :class="playing ? '' : '[animation-play-state:paused]'" style="height: 70%" />
  </div>
</template>
