<script setup lang="ts">
import { useRouter } from 'vue-router';

defineProps<{
  title: string
  subtitle?: string
  cover?: string
  to: string
  /** 角标： favourite 条目用 heart */
  badge?: 'heart'
}>()
const router = useRouter()
</script>

<template>
  <button class="group w-36 shrink-0 text-left" @click="router.push(to)">
    <div class="relative aspect-square overflow-hidden rounded-lg bg-fg-secondary ring-1 ring-white/5 transition duration-200 group-hover:ring-white/15 group-active:scale-[0.96]">
      <img
        v-if="cover"
        :src="cover"
        alt=""
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <svg v-else viewBox="0 0 24 24" class="m-auto mt-[32%] h-9 w-9 text-fg-secondary" fill="currentColor">
        <path d="M9 18V6l10-2v11.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="15.5" r="2.5" />
      </svg>
      <span
        v-if="badge === 'heart'"
        class="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-rose-400"
      >
        <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="currentColor">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      </span>
    </div>
    <p class="mt-2 truncate text-[13px] font-semibold text-fg-primary">{{ title }}</p>
    <p v-if="subtitle" class="mt-0.5 truncate text-xs text-fg-secondary">{{ subtitle }}</p>
  </button>
</template>