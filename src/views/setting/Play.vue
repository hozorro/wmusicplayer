<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMusicStore } from '@/store/music';
import { useI18n } from 'vue-i18n';
import type { PlayerConfig } from '@/config/player-config';

const { t } = useI18n()
const router = useRouter()
const store = useMusicStore();

// 即时生效参数
const instantParams = computed(() => [
  {
    key: 'AUTOLOOP' as keyof PlayerConfig,
    type: 'checkbox' as const,
    label: t('settings.play.params.autoloop'),
    tip: t('settings.play.params.autoloop_tip'),
  },
  {
    key: 'MAX_CONSECUTIVE_FAILURES' as keyof PlayerConfig,
    type: 'slider' as const,
    label: t('settings.play.params.max_consecutive_failures'),
    tip: t('settings.play.params.max_consecutive_failures_tip'),
    min: 1,
    max: 10,
    step: 1,
    format: (v: number) => `${v}`,
  },
  {
    key: 'STAT_PERCENT' as keyof PlayerConfig,
    type: 'slider' as const,
    label: t('settings.play.params.stat_percent'),
    tip: t('settings.play.params.stat_percent_tip'),
    min: 10,
    max: 90,
    step: 5,
    format: (v: number) => `${v}%`,
  },
  {
    key: 'HIT_MAX_SECONDS' as keyof PlayerConfig,
    type: 'slider' as const,
    label: t('settings.play.params.hit_max_seconds'),
    tip: t('settings.play.params.hit_max_seconds_tip'),
    min: 10,
    max: 300,
    step: 10,
    format: (v: number) => `${v}s`,
  },
  {
    key: 'RESTART_WINDOW' as keyof PlayerConfig,
    type: 'slider' as const,
    label: t('settings.play.params.restart_window'),
    tip: t('settings.play.params.restart_window_tip'),
    min: 0.5,
    max: 10,
    step: 0.5,
    format: (v: number) => `${v}s`,
  },
  {
    key: 'MAX_CACHED_TRACKS' as keyof PlayerConfig,
    type: 'slider' as const,
    label: t('settings.play.params.max_cached_tracks'),
    tip: t('settings.play.params.max_cached_tracks_tip'),
    min: 5,
    max: 100,
    step: 5,
    format: (v: number) => `${v}`,
  },
]);

// 预加载参数（重启后生效）
const preloadParams = computed(() => [
  {
    key: 'URL_AHEAD' as keyof PlayerConfig,
    type: 'slider' as const,
    label: t('settings.play.params.url_ahead'),
    tip: t('settings.play.params.url_ahead_tip'),
    min: 1,
    max: 10,
    step: 1,
    format: (v: number) => `${v}`,
  },
  {
    key: 'BYTES_AHEAD' as keyof PlayerConfig,
    type: 'slider' as const,
    label: t('settings.play.params.bytes_ahead'),
    tip: t('settings.play.params.bytes_ahead_tip'),
    min: 1,
    max: 10,
    step: 1,
    format: (v: number) => `${v}`,
  },
  {
    key: 'REFRESH_TICK_MS' as keyof PlayerConfig,
    type: 'slider' as const,
    label: t('settings.play.params.refresh_tick_ms'),
    tip: t('settings.play.params.refresh_tick_ms_tip'),
    min: 5000,
    max: 120000,
    step: 5000,
    format: (v: number) => `${(v / 1000).toFixed(0)}s`,
  },
  {
    key: 'PRELOAD_DELAY_MS' as keyof PlayerConfig,
    type: 'slider' as const,
    label: t('settings.play.params.preload_delay_ms'),
    tip: t('settings.play.params.preload_delay_ms_tip'),
    min: 0,
    max: 10000,
    step: 500,
    format: (v: number) => `${(v / 1000).toFixed(1)}s`,
  },
  {
    key: 'LOADING_RETRY_MS' as keyof PlayerConfig,
    type: 'slider' as const,
    label: t('settings.play.params.loading_retry_ms'),
    tip: t('settings.play.params.loading_retry_ms_tip'),
    min: 500,
    max: 10000,
    step: 500,
    format: (v: number) => `${(v / 1000).toFixed(1)}s`,
  },
  {
    key: 'LOAD_TIMEOUT_MS' as keyof PlayerConfig,
    type: 'slider' as const,
    label: t('settings.play.params.load_timeout_ms'),
    tip: t('settings.play.params.load_timeout_ms_tip'),
    min: 5000,
    max: 60000,
    step: 5000,
    format: (v: number) => `${(v / 1000).toFixed(0)}s`,
  },
]);

// 同步参数（重启后生效）
const syncParams = computed(() => [
  {
    key: 'SYNC_PAGE_SIZE' as keyof PlayerConfig,
    type: 'slider' as const,
    label: t('settings.play.params.sync_page_size'),
    tip: t('settings.play.params.sync_page_size_tip'),
    min: 100,
    max: 2000,
    step: 100,
    format: (v: number) => `${v}`,
  },
  {
    key: 'SYNC_PAGE_ATTEMPTS' as keyof PlayerConfig,
    type: 'slider' as const,
    label: t('settings.play.params.sync_page_attempts'),
    tip: t('settings.play.params.sync_page_attempts_tip'),
    min: 1,
    max: 10,
    step: 1,
    format: (v: number) => `${v}`,
  },
  {
    key: 'PLAYBACK_SYNC_MAX_ATTEMPTS' as keyof PlayerConfig,
    type: 'slider' as const,
    label: t('settings.play.params.playback_sync_max_attempts'),
    tip: t('settings.play.params.playback_sync_max_attempts_tip'),
    min: 1,
    max: 10,
    step: 1,
    format: (v: number) => `${v}`,
  },
  {
    key: 'BACKOFF_BASE_MS' as keyof PlayerConfig,
    type: 'slider' as const,
    label: t('settings.play.params.backoff_base_ms'),
    tip: t('settings.play.params.backoff_base_ms_tip'),
    min: 100,
    max: 5000,
    step: 100,
    format: (v: number) => `${(v / 1000).toFixed(1)}s`,
  },
  {
    key: 'BACKOFF_MAX_MS' as keyof PlayerConfig,
    type: 'slider' as const,
    label: t('settings.play.params.backoff_max_ms'),
    tip: t('settings.play.params.backoff_max_ms_tip'),
    min: 1000,
    max: 60000,
    step: 1000,
    format: (v: number) => `${(v / 1000).toFixed(0)}s`,
  },
]);

// IDB 查询参数（重启后生效）
const idbParams = computed(() => [
  {
    key: 'RANDOM_DEFAULT_NUM' as keyof PlayerConfig,
    type: 'number' as const,
    label: t('settings.play.params.random_default_num'),
    tip: t('settings.play.params.random_default_num_tip'),
    min: 10,
    max: 200,
  },
  {
    key: 'SCATTER_M_DEFAULT' as keyof PlayerConfig,
    type: 'number' as const,
    label: t('settings.play.params.scatter_m_default'),
    tip: t('settings.play.params.scatter_m_default_tip'),
    min: 1,
    max: 20,
  },
  {
    key: 'SCATTER_N_DEFAULT' as keyof PlayerConfig,
    type: 'number' as const,
    label: t('settings.play.params.scatter_n_default'),
    tip: t('settings.play.params.scatter_n_default_tip'),
    min: 10,
    max: 200,
  },
  {
    key: 'SCATTER_M_CAP' as keyof PlayerConfig,
    type: 'number' as const,
    label: t('settings.play.params.scatter_m_cap'),
    tip: t('settings.play.params.scatter_m_cap_tip'),
    min: 5,
    max: 50,
  },
  {
    key: 'SCATTER_N_CAP' as keyof PlayerConfig,
    type: 'number' as const,
    label: t('settings.play.params.scatter_n_cap'),
    tip: t('settings.play.params.scatter_n_cap_tip'),
    min: 50,
    max: 500,
  },
  {
    key: 'TOP_ARTISTS_COUNT' as keyof PlayerConfig,
    type: 'number' as const,
    label: t('settings.play.params.top_artists_count'),
    tip: t('settings.play.params.top_artists_count_tip'),
    min: 3,
    max: 20,
  },
  {
    key: 'RANDOM_ARTISTS_COUNT' as keyof PlayerConfig,
    type: 'number' as const,
    label: t('settings.play.params.random_artists_count'),
    tip: t('settings.play.params.random_artists_count_tip'),
    min: 2,
    max: 20,
  },
  {
    key: 'TOP_TRACKS_COUNT' as keyof PlayerConfig,
    type: 'number' as const,
    label: t('settings.play.params.top_tracks_count'),
    tip: t('settings.play.params.top_tracks_count_tip'),
    min: 5,
    max: 100,
  },
  {
    key: 'SEARCH_TYPE_LIMIT' as keyof PlayerConfig,
    type: 'number' as const,
    label: t('settings.play.params.search_type_limit'),
    tip: t('settings.play.params.search_type_limit_tip'),
    min: 10,
    max: 200,
  },
]);

// 滑块背景样式
function sliderBg(value: number, min: number, max: number): string {
  const pct = ((value - min) / (max - min)) * 100;
  return `linear-gradient(to right, #96f7e4 ${pct}%, rgba(255,255,255,0.6) ${pct}%)`;
}

// 更新参数
function updateParam<K extends keyof PlayerConfig>(key: K, value: PlayerConfig[K]) {
  store.setParam(key, value);
}
</script>

<template>
  <div class="px-2 pt-[calc(env(safe-area-inset-top)+10px)]">
    <div class="flex justify-between">
      <button
        class="shrink-0 rounded-full p-2 text-fg-secondary ring-1 ring-primary/10 backdrop-blur-sm transition hover:bg-fg-primary/85 active:scale-90"
        :aria-label="t('common.back')"
        @click="router.back()"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
      </button>
      <div class="flex-1 text-lg font-semibold text-right">{{ t('settings.play.item') }}</div>
    </div>

    <div class="mt-2 p-2 pb-32">
      <!-- 即时生效参数 -->
      <section class="mb-6 p-2 bg-secondary/50 rounded-xl">
        <h2 class="text-sm font-bold text-fg-primary mb-3 p-2 border-b border-fg-secondary/10">{{ t('settings.play.instant_params') }}</h2>
        <div class="space-y-3">
          <div
            v-for="param in instantParams"
            :key="param.key"
            class="rounded-xl bg-accent/5 p-4 ring-1 ring-white/5"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1">
                <p class="text-sm font-bold text-fg-primary">{{ param.label }}</p>
                <p class="mt-0.5 text-[11px] text-fg-muted">{{ param.tip }}</p>
              </div>
              <span v-if="param.type === 'slider'" class="text-base font-black tabular-nums text-accent ml-3">
                {{ param.format(store.params[param.key] as number) }}
              </span>
            </div>

            <!-- 复选框 -->
            <div v-if="param.type === 'checkbox'" class="flex items-center">
              <input
                type="checkbox"
                :id="param.key"
                :checked="store.params[param.key] as boolean"
                @change="updateParam(param.key, ($event.target as HTMLInputElement).checked as any)"
                class="h-5 w-5 rounded border-gray-300 text-accent focus:ring-accent"
              />
              <label :for="param.key" class="ml-2 text-sm text-fg-secondary">
                {{ store.params[param.key] ? t('common.yes') : t('common.no') }}
              </label>
            </div>

            <!-- 滑块 -->
            <div v-else-if="param.type === 'slider'" class="mt-3">
              <input
                type="range"
                :min="param.min"
                :max="param.max"
                :step="param.step"
                :value="store.params[param.key]"
                @input="updateParam(param.key, Number(($event.target as HTMLInputElement).value) as any)"
                :aria-label="param.label"
                class="h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none
                       [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent
                       [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-black/40
                       [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150
                       [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:active:scale-125
                       [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full
                       [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent"
                :style="{ background: sliderBg(store.params[param.key] as number, param.min, param.max) }"
              />
              <div class="mt-1.5 flex justify-between text-[10px] tabular-nums text-fg-muted">
                <span>{{ param.format(param.min) }}</span>
                <span>{{ param.format(param.max) }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 预加载参数（重启后生效） -->
      <section class="mb-6 p-2 bg-secondary/50 rounded-xl">
        <h2 class="text-sm font-bold text-fg-primary mb-3 p-2 border-b border-fg-secondary/10">
          {{ t('settings.play.preload_params') }}
          <span class="text-xs font-normal text-fg-muted ml-2">({{ t('settings.play.restart_required') }})</span>
        </h2>
        <div class="space-y-3">
          <div
            v-for="param in preloadParams"
            :key="param.key"
            class="rounded-xl bg-accent/5 p-4 ring-1 ring-white/5"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1">
                <p class="text-sm font-bold text-fg-primary">{{ param.label }}</p>
                <p class="mt-0.5 text-[11px] text-fg-muted">{{ param.tip }}</p>
              </div>
              <span class="text-base font-black tabular-nums text-accent ml-3">
                {{ param.format(store.params[param.key] as number) }}
              </span>
            </div>

            <div class="mt-3">
              <input
                type="range"
                :min="param.min"
                :max="param.max"
                :step="param.step"
                :value="store.params[param.key]"
                @input="updateParam(param.key, Number(($event.target as HTMLInputElement).value) as any)"
                :aria-label="param.label"
                class="h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none
                       [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent
                       [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-black/40
                       [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150
                       [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:active:scale-125
                       [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full
                       [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent"
                :style="{ background: sliderBg(store.params[param.key] as number, param.min, param.max) }"
              />
              <div class="mt-1.5 flex justify-between text-[10px] tabular-nums text-fg-muted">
                <span>{{ param.format(param.min) }}</span>
                <span>{{ param.format(param.max) }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 同步参数（重启后生效） -->
      <section class="mb-6 p-2 bg-secondary/50 rounded-xl">
        <h2 class="text-sm font-bold text-fg-primary mb-3 p-2 border-b border-fg-secondary/10">
          {{ t('settings.play.sync_params') }}
          <span class="text-xs font-normal text-fg-muted ml-2">({{ t('settings.play.restart_required') }})</span>
        </h2>
        <div class="space-y-3">
          <div
            v-for="param in syncParams"
            :key="param.key"
            class="rounded-xl bg-accent/5 p-4 ring-1 ring-white/5"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1">
                <p class="text-sm font-bold text-fg-primary">{{ param.label }}</p>
                <p class="mt-0.5 text-[11px] text-fg-muted">{{ param.tip }}</p>
              </div>
              <span class="text-base font-black tabular-nums text-accent ml-3">
                {{ param.format(store.params[param.key] as number) }}
              </span>
            </div>

            <div class="mt-3">
              <input
                type="range"
                :min="param.min"
                :max="param.max"
                :step="param.step"
                :value="store.params[param.key]"
                @input="updateParam(param.key, Number(($event.target as HTMLInputElement).value) as any)"
                :aria-label="param.label"
                class="h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none
                       [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent
                       [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-black/40
                       [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150
                       [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:active:scale-125
                       [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full
                       [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent"
                :style="{ background: sliderBg(store.params[param.key] as number, param.min, param.max) }"
              />
              <div class="mt-1.5 flex justify-between text-[10px] tabular-nums text-fg-muted">
                <span>{{ param.format(param.min) }}</span>
                <span>{{ param.format(param.max) }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- IDB 查询参数（重启后生效） -->
      <section class="mb-6 p-2 bg-secondary/50 rounded-xl">
        <h2 class="text-sm font-bold text-fg-primary mb-3 p-2 border-b border-fg-secondary/10">
          {{ t('settings.play.idb_params') }}
          <span class="text-xs font-normal text-fg-muted ml-2">({{ t('settings.play.restart_required') }})</span>
        </h2>
        <div class="space-y-3">
          <div
            v-for="param in idbParams"
            :key="param.key"
            class="rounded-xl bg-accent/5 p-4 ring-1 ring-white/5"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1">
                <p class="text-sm font-bold text-fg-primary">{{ param.label }}</p>
                <p class="mt-0.5 text-[11px] text-fg-muted">{{ param.tip }}</p>
              </div>
            </div>

            <div class="mt-3 flex items-center gap-3">
              <input
                type="number"
                :min="param.min"
                :max="param.max"
                :value="store.params[param.key]"
                @input="updateParam(param.key, Number(($event.target as HTMLInputElement).value) as any)"
                :aria-label="param.label"
                class="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm text-fg-primary ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <span class="text-xs text-fg-muted whitespace-nowrap">
                {{ param.min }} - {{ param.max }}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
