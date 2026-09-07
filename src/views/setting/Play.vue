<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMusicStore } from '@/store/music';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
const router = useRouter()

const store = useMusicStore();
const playRatio = computed({
  get() { return store.getParam('stat_percent') },
  set(val) { store.setParam('stat_percent', val) }
})
const switchTime = computed({
  get() { return store.getParam('switch_time') },
  set(val) { store.setParam('switch_time', val) }
})
const retryTimes = computed({
  get() { return store.getParam('max_fail_count') },
  set(val) { store.setParam('max_fail_count', val) }
})
const isLoop = computed({
  get() { return store.getParam('isLoop') },
  set(val) { store.setParam('isLoop', val) }
})
const isAutoNext = computed({
  get() { return store.getParam('isAutoPlayNext') },
  set(val) { store.setParam('isAutoPlayNext', val) }
})
const refreshTime = computed({
  get() { return store.getParam('timeUpdateInterval') },
  set(val) { store.setParam('timeUpdateInterval', val) }
})
const syncBatchSize = computed({
  get() { return store.getParam('transferBatchSize') },
  set(val) { store.setParam('transferBatchSize', val) }
})
</script>

<template>
  <div class=" px-2 pt-[calc(env(safe-area-inset-top)+10px)]">
    <div class=" flex justify-between">
      <button
        class="shrink-0 rounded-full p-2 text-fg-secondary ring-1 ring-primary/10 backdrop-blur-sm transition hover:bg-fg-primary/85 active:scale-90"
        :aria-label="t('common.back')"
        @click="router.back()"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
      </button>
      <div class=" flex-1 text-lg font-semibold text-right">{{ t('settings.play.item') }}</div>
    </div>
    <div class=" mt-2 p-2">
      <div class=" flex justify-between items-center w-full py-2 border-b border-gray-200">
        <div class=" flex-1 mr-2">
          <div>{{ t('settings.play.ratio') }}<span class=" text-sm text-amber-500"> ({{ playRatio }}%)</span></div>
          <div class=" text-xs text-gray-400">{{ t('settings.play.ratio_tip') }}</div>
        </div>
        <div class=" flex-none">
          <input type="range" min="10" max="100" step="10" v-model="playRatio" class=" w-32">
        </div>
      </div>
      <div class=" flex justify-between items-center w-full py-2 border-b border-gray-200">
        <div class=" flex-1 mr-2">
          <div>{{ t('settings.play.switch_delay') }}<span class=" text-sm text-amber-500"> ({{ switchTime }} ms)</span></div>
          <div class=" text-xs text-gray-400">{{ t('settings.play.switch_delay_tip') }}</div>
        </div>
        <div class=" flex-none">
          <input type="range" min="100" max="900" step="100" v-model="switchTime" class=" w-32">
        </div>
      </div>
      <div class=" flex justify-between items-center w-full py-2 border-b border-gray-200">
        <div class=" flex-1 mr-2">
          <div>{{ t('settings.play.reties') }}<span class=" text-sm text-amber-500"> ({{ retryTimes }} {{ t('settings.play.times') }})</span></div>
          <div class=" text-xs text-gray-400">{{ t('settings.play.reties_tip') }}</div>
        </div>
        <div class=" flex-none">
          <input type="range" min="1" max="10" step="1" v-model="retryTimes" class=" w-32">
        </div>
      </div>
      <div class=" flex justify-between items-center w-full py-2 border-b border-gray-200">
        <div class=" flex-1 mr-2">
          <div>{{ t('settings.play.autoloop') }}<span class=" text-sm text-amber-500"> ({{ isLoop ? t('common.yes') : t('common.no') }})</span></div>
          <div class=" text-xs text-gray-400">{{ t('settings.play.autoloop_tip') }}</div>
        </div>
        <div class=" flex-none justify-items-end">
          <input type="checkbox" v-model="isLoop" class=" w-12">
        </div>
      </div>
      <div class=" flex justify-between items-center w-full py-2 border-b border-gray-200">
        <div class=" flex-1 mr-2">
          <div>{{ t('settings.play.autonext') }}<span class=" text-sm text-amber-500"> ({{ isAutoNext ? t('common.yes') : t('common.no') }})</span></div>
          <div class=" text-xs text-gray-400">{{ t('settings.play.autonext_tip') }}</div>
        </div>
        <div class=" flex-none justify-items-end">
          <input type="checkbox" v-model="isAutoNext" class=" w-12">
        </div>
      </div>
      <div class=" flex justify-between items-center w-full py-2 border-b border-gray-200">
        <div class=" flex-1 mr-2">
          <div>{{ t('settings.play.refresh_time') }}<span class=" text-sm text-amber-500"> ({{ refreshTime }} ms)</span></div>
          <div class=" text-xs text-gray-400">{{ t('settings.play.refresh_time_tip') }}</div>
        </div>
        <div class=" flex-none">
          <input type="range" min="100" max="900" step="100" v-model="refreshTime" class=" w-32">
        </div>
      </div>
      <div class=" flex justify-between items-center w-full py-2">
        <div class=" flex-1 mr-2">
          <div>{{ t('settings.play.sync_batch_size') }}<span class=" text-sm text-amber-500"> ({{ syncBatchSize }} {{ t('settings.play.sync_batch_size_unit') }})</span></div>
          <div class=" text-xs text-gray-400">{{ t('settings.play.sync_batch_size_tip') }}</div>
        </div>
        <div class=" flex-none">
          <input type="range" min="100" max="900" step="100" v-model="syncBatchSize" class=" w-32">
        </div>
      </div>
    </div>
  </div>
  
</template>