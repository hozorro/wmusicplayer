<!-- components/PwaUpdateBanner.vue —— SW 更新就绪提示条，层级压过 PlayBox(z-40) 与 ToastHost(z-95) -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { usePWAUpdate } from '@/composables/pwa-update'

const { t } = useI18n()
const { updateAvailable, updating, dismissed, applyUpdate, deferUpdate } = usePWAUpdate()
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-3"
    leave-active-class="transition duration-200 ease-in"
    leave-to-class="opacity-0 translate-y-3"
  >
    <div
      v-if="updateAvailable && !dismissed"
      class="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+96px)] z-[96] flex items-center gap-3 rounded-xl bg-primary/95 px-4 py-3 shadow-2xl shadow-primary/20 ring-1 ring-primary/10 backdrop-blur-xl"
      role="status"
    >
      <span class="min-w-0 flex-1 truncate text-sm font-medium text-fg-primary">
        {{ t('pwa.update_available') }}
      </span>
      <button
        class="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-fg-muted transition hover:text-fg-secondary active:scale-95 disabled:pointer-events-none disabled:opacity-40"
        :disabled="updating"
        @click="deferUpdate"
      >
        {{ t('pwa.update_later') }}
      </button>
      <button
        class="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-accent/25 transition hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-60"
        :disabled="updating"
        @click="applyUpdate"
      >
        <span
          v-if="updating"
          class="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white"
        ></span>
        {{ t('pwa.update_now') }}
      </button>
    </div>
  </Transition>
</template>
