<script setup lang="ts">
/**
 * 单行跑马灯：文本超宽时从右向左循环滚动。
 * 内容复制两份 + 位移 -50%，滚到末尾时第二份正好接管，不会出现右侧空白。
 * 左右用 mask 做淡入淡出，速度按“像素/秒”恒定，长文本自动变慢。
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  text: string
  /** 滚动速度，px/s */
  speed?: number
  /** 两份内容之间的空隙，px */
  gap?: number
}>(), { speed: 48, gap: 40 })

const host = ref<HTMLElement>()
const first = ref<HTMLElement>()
const scrolling = ref(false)
const duration = ref(20)

let ro: ResizeObserver | null = null

function measure() {
  const box = host.value
  const span = first.value
  if (!box || !span) return

  const textWidth = span.offsetWidth
  const shouldScroll = textWidth > box.clientWidth + 1
  scrolling.value = shouldScroll
  if (shouldScroll) {
    // 一个循环要走 文本宽 + 空隙 的距离
    duration.value = Math.max(6, (textWidth + props.gap) / Math.max(1, props.speed))
  }
}

onMounted(() => {
  nextTick(measure)
  ro = new ResizeObserver(measure)
  if (host.value) ro.observe(host.value)
  if (first.value) ro.observe(first.value)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
})

watch(() => [props.text, props.speed, props.gap], () => nextTick(measure))
</script>

<template>
  <div
    ref="host"
    class="w-full overflow-hidden"
    :class="{'[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]': scrolling}"
  >
    <div
      class="flex whitespace-nowrap will-change-transform"
      :class="scrolling
        ? 'w-max animate-marquee motion-reduce:animate-none'
        : 'w-full justify-end'"
      :style="scrolling ? { animationDuration: `${duration}s` } : undefined"
    >
      <span ref="first" class="shrink-0">{{ text }}</span>
      <template v-if="scrolling">
        <span class="shrink-0" :style="{ width: `${gap}px` }" aria-hidden="true"></span>
        <span class="shrink-0" aria-hidden="true">{{ text }}</span>
        <span class="shrink-0" :style="{ width: `${gap}px` }" aria-hidden="true"></span>
      </template>
    </div>
  </div>
</template>
