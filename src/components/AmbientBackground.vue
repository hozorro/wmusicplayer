<script setup lang="ts">
/**
 * 氛围背景：封面调色板双层交叉淡入 + 固定scrim
 * 定位由父级决定：页面用 fixed 包裹，PlayBox 用 absolute 容器
 */
import { computed } from 'vue'
import { useArtworkPalette } from '@/composables/artwork-palette';

const props = defineProps<{ cover?: string }>()
const coverRef = computed(() => props.cover)
const { layers } = useArtworkPalette(coverRef)
</script>

<template>
  <div class=" absolute inset-0 overflow-hidden" aria-hidden="true">
    <div
      v-for="layer in layers"
      :key="layer.id"
      class=" absolute -inset-10 blur-3xl transition-opacity duration-1000 ease-out"
      :class="layer.id === layers[0].id ? 'opacity-100' : 'opacity-0'"
      :style="{ background: layer.css}"
    >
    </div>
    <!-- 结构化可读性第二层：固定 scrim，对比度下限锁定 -->
    <div class=" absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black65"></div>
  </div>
</template>