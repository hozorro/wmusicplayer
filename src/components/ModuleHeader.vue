<script setup lang="ts">
/**
 * 模块标题：携 to = 列表入口（查看全部 + 箭头）
 * 缺省 to = 纯标题（最近添加 / 最常播放 tab 模块）
 */
import { useRouter } from 'vue-router'

defineProps<{ title: string, to?: string }>()
const router = useRouter()
</script>

<template>
  <div class=" flex items-end justify-between px-4 pt-7">
    <h2 class=" text-lg font-extrabold tracking-tight text-zinc-50">{{ title }}</h2>
    <button
      v-if="to"
      class="group flex items-center gap-0.5 pb-0.5 text-xs font-medium text-zinc-500 transition hover:text-zinc-200 active:scale-95"
      @click="router.push(to)"
    >
      查看全部
      <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
           fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  </div>
</template>