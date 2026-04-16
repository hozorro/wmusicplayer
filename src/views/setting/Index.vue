<script setup lang="ts"> 
import { ref, computed, onMounted } from 'vue';
import { useMusicStore } from '@/store/music';
import { useTheme } from '@/composables/themes';
import { appInfo } from '@/constants/app-info';
import MenuItem from '@/components/MenuItem.vue';
import { langsMap, loadLocaleMessages } from '@/i18n';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { theme, toggleTheme } = useTheme();

const appName = appInfo.VUE_APP_NAME
const appVersion = appInfo.VUE_APP_VERSION
const menuList = computed(() => [ // must be computed, or the menu will not update when language changes
  { title: t('settings.play.item'), to: '/setting/play', icon: 'icon-[solar--tuning-square-2-outline]' },
  { title: t('settings.localdb.item'), to: '/setting/localdb', icon: 'icon-[solar--database-outline]' },
  { title: t('settings.help'), to: '/setting/help', icon: 'icon-[solar--notebook-bookmark-outline]' },
  { title: t('settings.test'), to: '/setting/test', icon: 'icon-[solar--flashlight-outline] origin-center rotate-180' },
  { title: t('settings.about.item'), to: '/setting/about', icon: 'icon-[solar--cassette-outline]' },
]);

interface MetaInfo {
  folder: number;
  track: number;
  artist: number;
  album: number;
  genre: number;
  playlist: number;
}

const isIDBReady = ref(false);
const dbMeta = ref<MetaInfo>({
  folder: 0,
  track: 0,
  artist: 0,
  album: 0,
  genre: 0,
  playlist: 0,
});
const store = useMusicStore();
const idbHelper = store.idbHelper
const currentLocale = computed({
  get() { return store.locale },
  set(val) { store.locale = val }
})
async function getLocalStatus() {
  if (!('caches' in window)) return;

  const cache = await caches.open('pwa-state');
  const response = await cache.match('/__db_ready');
  isIDBReady.value = response ? (await response.text()) == 'true' : false;
}

async function getLocalMetaInfo() {
  const metaList = await idbHelper.getAll<IMeta<keyof MetaInfo>>('meta')
  if (metaList.length === 0) return;
  metaList.forEach(meta => {
    dbMeta.value[meta.name] = meta.total_count
  })
}

async function refreshIdbStatus() {
  if (!('caches' in window)) return;
  const hasLocalData = Object.values(dbMeta.value).some(count => count > 0);
  if (hasLocalData && isIDBReady.value == false)
  {
    isIDBReady.value = true;
    const cache = await caches.open('pwa-state');
    await cache.put('/__db_ready', new Response('true', {
      headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }
    }));
    if('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({type: 'IDB_Ready'})
    }
  }
}

onMounted(() => {
  getLocalStatus();
  getLocalMetaInfo();
});

async function changeLocale(locale: SupportedLocale) {
  currentLocale.value = locale;
  await loadLocaleMessages(locale);
}
</script>

<template>
  <div class=" p-2">
    <div class=" flex justify-between">
      <router-link to="/" class=" flex-none text-lg font-semibold">
        <span class=" icon-[solar--alt-arrow-left-linear] align-middle text-gray-600"></span>
      </router-link>
      <div class=" flex-1 text-lg font-semibold text-right">{{ t('settings.title') }}</div>
    </div>
    <div class=" mt-4 flex justify-between p-2">
      <div class=" flex-none">
        <img src="/favicon.svg" class=" w-18 h-18 rounded-md shadow" alt="logo" />
      </div>
      <div class=" flex-1 pl-4">
        <div class=" text-lg font-semibold">{{ appName }}</div>
        <div class=" text-sm text-gray-500">{{ appVersion }}</div>
        <div class=" w-full mt-1 pl-1 rounded-md bg-gray-200 dark:bg-teal-800/50 text-sm">{{ t('settings.comment') }}</div>
      </div>
    </div>
    <div class=" mt-4 p-2 bg-gray-200 dark:bg-teal-800/50 rounded-md text-sm">
      <div class=" flex justify-between">
        <div class=" flex-1">{{ t('settings.local_cache_status') }}: {{ isIDBReady ? t('settings.ready') : t('settings.not_ready') }}</div>
        <div class=" flex-none text-cyan-500" @click="refreshIdbStatus">{{ t('common.refresh') }}</div>
      </div>
      <div class=" mt-1 ml-4 flex justify-between">
        <div class=" flex-1">{{ t('player.directory') }}: {{ dbMeta.folder }}</div>
        <div class=" flex-1">{{ t('player.track') }}: {{ dbMeta.track }}</div>
      </div>
      <div class=" mt-1 ml-4 flex justify-between">
        <div class=" flex-1">{{ t('player.artist') }}: {{ dbMeta.artist }}</div>
        <div class=" flex-1">{{ t('player.album') }}: {{ dbMeta.album }}</div>
      </div>
      <div class=" mt-1 ml-4 flex justify-between">
        <div class=" flex-1">{{ t('player.genre') }}: {{ dbMeta.genre }}</div>
        <div class=" flex-1">{{ t('player.playlist') }}: {{ dbMeta.playlist }}</div>
      </div>
    </div>
    <div class=" mt-4 p-2">
      <div class=" flex justify-between w-full py-2 border-b border-gray-200 dark:border-teal-800/50">
        <div>
          <span class=" icon-[solar--pallete-2-outline] text-xl align-middle mr-2"></span>
          <span>{{ t('settings.theme') }}</span>
        </div>
        <div>
          <button class=" px-2 py-1 text-sm rounded-md bg-stone-200 dark:bg-teal-800/50 dark:text-teal-200" @click="toggleTheme">{{ theme }}</button>
        </div>
      </div>
      <div class=" flex justify-between w-full py-2 border-b border-gray-200 dark:border-teal-800/50">
        <div>
          <span class=" icon-[solar--sort-by-alphabet-outline] text-xl align-middle mr-2"></span>
          <span>{{ t('settings.language') }}</span>
        </div>
        <div>
          <select v-model="currentLocale" @change="changeLocale(currentLocale)">
            <option v-for="(item, index) in langsMap" :key="index" :value="item.value">{{ item.label }}</option>
          </select>
        </div>
      </div>
      <MenuItem v-for="item in menuList" :key="item.title" 
        :title="item.title" 
        :to-url="item.to" 
        :icon="item.icon"
        class=" border-b border-gray-200 dark:border-teal-800/50 last:border-0"
      />
    </div>
  </div>
</template>