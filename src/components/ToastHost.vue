<!-- components/ToastHost.vue —— 挂载于 DefaultLayout，层级压过一切弹层 -->
<script setup lang="ts">
import { activeToasts, type ToastKind } from '@/services/toast'

const mapBg: Record<ToastKind, string> = {
  success: 'bg-green-500/95',
  error: 'bg-red-500/95',
  warning: 'bg-yellow-500/95',
  info: 'bg-blue-500/95'
}
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-24 z-[95] flex flex-col items-center gap-2 px-6">
    <TransitionGroup
      enter-active-class="transition duration-250 ease-out" enter-from-class="opacity-0 translate-y-2"
      leave-active-class="transition duration-200 ease-in" leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-for="t in activeToasts" :key="t.id"
        class="max-w-sm rounded-full px-4 py-2 text-center text-xs font-medium text-zinc-100 shadow-xl shadow-black/40 ring-1 ring-white/10"
        :class="mapBg[t.kind]"
      >
        {{ t.msg }}
      </div>
    </TransitionGroup>
  </div>
</template>