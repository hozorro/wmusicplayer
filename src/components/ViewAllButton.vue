<script setup lang="ts">
/** 模块右上角「查看全部」入口：ModuleHeader 与首页 tab 区共用，保证样式一致 */
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

defineProps<{ to: string }>()
const router = useRouter()
const { t } = useI18n()
</script>

<template>
  <button
    class="group flex items-center gap-0.5 pb-0.5 text-xs font-medium text-fg-secondary transition hover:text-fg-muted active:scale-95"
    @click="router.push(to)"
  >
    {{ t('common.view_all') }}
    <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
         fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  </button>
</template>
