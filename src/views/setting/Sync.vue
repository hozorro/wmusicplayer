<script setup lang="ts">
/**
 * 手动同步页
 * 进度预算来自 summary counts；完成判定以游标为协议真值
 * 就绪状态决定按钮语义与首起文案
 */
import { idbReady } from '@/services/idb-state'
import { SYNC_STORES, syncLibrary, syncState } from '@/services/lib-sync'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'


const router = useRouter()
const { t } = useI18n()

const STORE_LABEL: Record<string, string> = {
  tracks: t('player.track'), artists: t('player.artist'), albums: t('player.album'),
  genres: t('player.genre'), folders: t('player.folder'), playlists: t('player.playlist'),
}

const overallPct = computed(() => syncState.totalBatches
  ? Math.min(100, Math.round((syncState.doneBatches / syncState.totalBatches) * 100))
  : 0
)
</script>

<template>
  <div class=" min-h-dvh">
    <!-- 粘性导航 -->
    <div class=" sticky top-0 z-30 border-b border-fg-primary/5 backdrop-blur-md">
      <div class=" mx-auto flex max-w-2xl items-center gap-3 px-4 py-2.5 pt-[calc(env(safe-area-inset-top)+10px)]">
        <button
          class=" rounded-full p-2 text-fg-muted transition hover:bg-fg-primary/8 hover:text-fg-primary active:scale-90"
          :aria-label="t('common.back')"
          @click="router.back()"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <h1 class=" text-lg font-bold text-fg-primary">{{ t('settings.sync.item') }}</h1>
      </div>
    </div>

    <main class=" mx-auto max-w-2xl px-4 pb-32 pt-6">
      <p class=" text-xs text-fg-muted">
        {{ idbReady ? t('settings.sync.last_sync', { time: syncState.lastSyncAt ?? '-' }) : t('settings.sync.not_init') }}
      </p>

      <!-- 总进度 -->
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-1"
        leave-active-class="transition duration-200 ease-in"
        leave-to-class="opacity-0"
      >
        <div v-if="syncState.running" class=" mt-5">
          <div class=" flex items-center justify-between text-xs tabular-nums text-fg-muted">
            <span>{{ t('settings.sync.syncing') }}：{{ STORE_LABEL[syncState.currentStore ?? ''] ?? '...' }}</span>
            <span>{{ syncState.doneBatches }} / {{ syncState.totalBatches }} {{ t('settings.sync.batch') }} · {{ overallPct }}%</span>
          </div>
          <div class=" mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div 
              class=" h-full rounded-full bg-accent transition-[width] duration-300 ease-linear" 
              :style="{ width: `${overallPct}%` }"
            ></div>
          </div>
        </div>
      </Transition>

      <!-- 分 store 明细 -->
      <div v-if="syncState.batches" class=" mt-6 space-y-2.5">
        <div v-for="s in SYNC_STORES" :key="s" class=" flex items-center justify-between text-sm">
          <span class=" text-fg-muted">{{ STORE_LABEL[s] }}</span>
          <span class=" tabular-nums text-fg-secondary">
            {{ syncState.batches[s].received }} / {{ syncState.batches[s].total }}
          </span>
        </div>
      </div>

      <button
        class=" mt-8 w-full rounded-full bg-accent py-2.5 text-sm font-bold text-primary shadow-lg shadow-accent/20 transition hover:bg-accent/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
        :disabled="syncState.running"
        @click="syncLibrary()"
      >
        {{ syncState.running ? `${t('settings.sync.syncing')}...` : idbReady ? t('settings.sync.incremental') : t('settings.sync.syncall') }}
      </button>

      <p class=" mt-3 text-center text-[11px] text-fg-muted">
        {{ t('settings.sync.sync_hint') }}
      </p>
    </main>
  </div>
</template>