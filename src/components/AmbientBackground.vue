<script setup lang="ts">
/**
 * 氛围背景：封面调色板双层交叉淡入 + 按主题锁定的固定 scrim
 * dark：暗区调色板 + 黑色 scrim；light：粉彩调色板 + 白色 scrim
 * 定位由父级决定：页面用 fixed 包裹，PlayBox 用 absolute 容器
 */
import { computed } from 'vue'
import { useArtworkPalette } from '@/composables/artwork-palette';
import { useTheme } from '@/composables/themes'
import { ambientGradient, ambientGradientLight, type Palette } from '@/utilies/palette'

const props = defineProps<{ cover?: string }>()
const coverRef = computed(() => props.cover)
const { layers } = useArtworkPalette(coverRef)
const { isDark } = useTheme()

/** 主题切换即时重算渐变（层内存的是调色板，无需重新提色） */
const backgroundOf = (p: Palette) =>
  isDark.value ? ambientGradient(p) : ambientGradientLight(p)
</script>

<template>
  <div class=" absolute inset-0 overflow-hidden" aria-hidden="true">
    <div
      v-for="layer in layers"
      :key="layer.id"
      class=" absolute -inset-10 blur-3xl transition-opacity duration-1000 ease-out"
      :class="layer.id === layers[0].id ? 'opacity-100' : 'opacity-0'"
      :style="{ background: backgroundOf(layer.palette) }"
    >
    </div>
    <!-- 结构化可读性 scrim：文字/控件密集的上下缘重、中部透，锁对比度下限同时放调色板透出来 -->
    <div class=" absolute inset-0 bg-gradient-to-b from-white/70 via-white/30 to-white/75 dark:from-black/45 dark:via-black/18 dark:to-black/55"></div>
  </div>
</template>
