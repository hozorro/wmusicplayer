<!-- 可点按的页码圆点 -->
<script setup lang="ts">
const props = defineProps<{count: number; active: number}>()
defineEmits<{go: [page: number]}>()
</script>

<template>
  <div class=" flex justify-center gap-1.5 pt-3">
    <button
      v-for="p in count"
      :key="p"
      class=" rounded-full h-1.5 transition-all duration-300"
      :class="p - 1 === active ? 'w-4 bg-fg-secondary' : 'w-1.5 bg-secondary hover:bg-primary'"
      :aria-label="`第 ${p} 屏`"
      @click="$emit('go', p - 1)"
    />
  </div>
</template>