<script setup lang="ts">
/**
 * 模块标题：携 to = 列表入口（查看全部 + 箭头）
 * 缺省 to = 纯标题
 */
import ViewAllButton from './ViewAllButton.vue'

defineProps<{ title: string, to?: string }>()
</script>

<template>
  <div class=" flex items-end justify-between px-4 pt-4">
    <h2 class=" text-lg font-extrabold tracking-tight text-fg-primary">{{ title }}</h2>
    <ViewAllButton v-if="to" :to="to" />
  </div>
</template>
