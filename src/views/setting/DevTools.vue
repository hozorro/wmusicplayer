<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useQueueStore } from '@/store/queue';

const { t } = useI18n();
const router = useRouter();
const queueStore = useQueueStore();

type TabKey = 'requestQueue' | 'order';
const activeTab = ref<TabKey>('requestQueue');

const tabs = computed(() => [
  { key: 'requestQueue' as TabKey, label: t('settings.devtools.request_queue') },
  { key: 'order' as TabKey, label: t('settings.devtools.play_order') },
]);

const requestList = computed(() => queueStore.requestQueue);

const orderList = computed(() => {
  const { order, position, tracks } = queueStore.queueState;
  const trackMap = new Map(tracks.map(track => [track.id, track]));
  return order.map((id, index) => ({
    id,
    index,
    title: trackMap.get(id)?.title ?? String(id),
    isCurrent: index === position,
  }));
});
</script>

<template>
  <div class=" min-h-dvh">
    <!-- 粘性导航 -->
    <div class=" sticky top-0 z-30 border-b border-fg-primary/5 backdrop-blur-md">
      <div class=" mx-auto flex max-w-2xl items-center gap-2 pl-2 pr-4 py-2.5 pt-[calc(env(safe-area-inset-top)+10px)]">
        <button
          class=" rounded-full p-2 text-fg-muted transition hover:bg-fg-primary/8 hover:text-fg-primary active:scale-90"
          :aria-label="t('common.back')"
          @click="router.back()"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <h1 class=" text-lg font-bold text-fg-primary">{{ t('settings.devtools.item') }}</h1>
      </div>
    </div>

    <main class=" mx-auto max-w-2xl px-4 pb-32 pt-6">
      <!-- Tab 切换 -->
      <div class=" flex gap-2 border-b border-fg-primary/10">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class=" px-4 py-2 text-sm transition border-b-2 -mb-px"
          :class="activeTab === tab.key
            ? 'border-accent text-fg-primary font-semibold'
            : 'border-transparent text-fg-muted hover:text-fg-primary'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 请求队列 -->
      <div v-if="activeTab === 'requestQueue'" class=" mt-4">
        <div v-if="requestList.length === 0" class=" py-8 text-center text-sm text-fg-muted">
          {{ t('settings.devtools.empty') }}
        </div>
        <ul v-else class=" divide-y divide-border text-sm">
          <li v-for="(req, i) in requestList" :key="i" class=" flex gap-3 py-2">
            <span class=" shrink-0 font-mono text-fg-muted">{{ req.reqTime }}</span>
            <span class=" flex-1 break-all text-fg-primary">{{ req.reqInfo }}</span>
          </li>
        </ul>
      </div>

      <!-- 播放顺序 -->
      <div v-else class=" mt-4">
        <div v-if="orderList.length === 0" class=" py-8 text-center text-sm text-fg-muted">
          {{ t('settings.devtools.empty') }}
        </div>
        <ul v-else class=" divide-y divide-border text-sm">
          <li
            v-for="item in orderList"
            :key="item.index"
            class=" flex items-center gap-3 py-2"
            :class="item.isCurrent ? 'text-primary font-semibold' : 'text-fg-primary'"
          >
            <span class=" w-8 shrink-0 text-right font-mono text-fg-muted">{{ item.index }}</span>
            <span class=" w-16 shrink-0 font-mono text-fg-muted">#{{ item.id }}</span>
            <span class=" flex-1 truncate">{{ item.title }}</span>
            <span v-if="item.isCurrent" class=" shrink-0 text-xs">{{ t('settings.devtools.current') }}</span>
          </li>
        </ul>
      </div>
    </main>
  </div>
</template>
