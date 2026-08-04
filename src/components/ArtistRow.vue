<script setup lang="ts">
/** 艺人行：头像 + 名称插槽（承载高亮富文本）+ 导航箭头 */
import { useRouter } from 'vue-router'

defineProps<{
  id: number
  face?: string
  /** 无头像时的兜底字符（通常取 name 首字） */
  fallback?: string
}>()
const router = useRouter()
</script>

<template>
  <button
    class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5 active:scale-[0.99]"
    @click="router.push(`/artist/${id}`)"
  >
    <div class="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-zinc-800 ring-1 ring-white/5">
      <img v-if="face" :src="face" alt="" class="h-full w-full object-cover" />
      <span v-else class="flex h-full items-center justify-center text-sm font-bold text-zinc-500">
        {{ fallback ?? '?' }}
      </span>
    </div>
    <div class="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100">
      <slot />
    </div>
    <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0 text-zinc-600" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  </button>
</template>