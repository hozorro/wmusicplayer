<script setup lang="ts">
import { openEntityMenu } from '@/player/menu/state'
import type { MenuSource } from '@/player/menu/types'
import { useI18n } from 'vue-i18n';

defineProps<{ source: MenuSource }>()

const { t } = useI18n()
</script>

<template>
  <button
    class="shrink-0 rounded-full p-2 text-zinc-500 transition hover:bg-white/10 hover:text-zinc-200 active:scale-90"
    :aria-label="t('common.more_actions')"
    @click.stop="openEntityMenu(source)"
  >
    <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
      <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
    </svg>
  </button>
</template>