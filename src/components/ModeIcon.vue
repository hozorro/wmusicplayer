<script setup lang="ts">
/** 随机模式图标：stroke / fill / evenodd 三种形态自适应 */
import { RANDOM_ICONS } from '@/services/random-icons'

defineProps<{ icon: string }>()
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    :fill="RANDOM_ICONS[icon]?.stroke ? 'none' : 'currentColor'"
    :stroke="RANDOM_ICONS[icon]?.stroke ? 'currentColor' : 'none'"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
  >
    <path
      v-for="(d, i) in RANDOM_ICONS[icon]?.d"
      :key="i"
      :d="d"
      :fill-rule="RANDOM_ICONS[icon]?.evenodd ? 'evenodd' : undefined"
    />
  </svg>
</template>