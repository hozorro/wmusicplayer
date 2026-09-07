<script setup lang="ts"> 
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMusicStore } from '@/store/music';
import { useTheme } from '@/composables/themes';
import { appInfo } from '@/constants/app-info';
import { idbReady } from '@/services/idb-state';
import RouteMenuItem from '@/components/RouteMenuItem.vue';
import { langsMap, loadLocaleMessages } from '@/i18n';
import { useI18n } from 'vue-i18n';
import { SW_VERSION } from '@/constants/app-info';

const { t } = useI18n();
const { theme, toggleTheme } = useTheme();
const router = useRouter()

const appName = appInfo.VUE_APP_NAME
const appVersion = appInfo.VUE_APP_VERSION
const swVersion = SW_VERSION
const menuList = computed(() => {// must be computed, or the menu will not update when language changes
  const menuItems = [ 
    { title: t('settings.play.item'), to: '/setting/play', icon: 'icon-[solar--tuning-square-2-outline]' },
    { title: t('settings.sync.item'), to: '/setting/sync', icon: 'icon-[solar--database-outline]' },
    { title: t('settings.help'), to: '/setting/help', icon: 'icon-[solar--notebook-bookmark-outline]' },
    { title: t('settings.about.item'), to: '/setting/about', icon: 'icon-[solar--cassette-outline]' },
  ]
  const devItems = [
    { title: 'dev-runtime', to: '/dev/runtime', icon: 'icon-[solar--test-tube-linear]' },
    { title: 'dev-player', to: '/dev/player', icon: 'icon-[solar--play-stream-linear]' },
  ]
  if (import.meta.env.DEV) menuItems.push(...devItems) 
  return menuItems;
});

const store = useMusicStore();
const currentLocale = computed({
  get() { return store.locale },
  set(val) { store.locale = val }
})

async function changeLocale(locale: SupportedLocale) {
  currentLocale.value = locale;
  await loadLocaleMessages(locale);
}
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
      <div class=" flex-1 text-lg font-semibold text-right">{{ t('settings.title') }}</div>
    </div>
    <div class=" mt-4 flex justify-between p-2">
      <div class=" flex-none">
        <img src="/favicon.svg" class=" w-18 h-18 rounded-md shadow" alt="logo" />
      </div>
      <div class=" flex-1 pl-4">
        <div class=" text-lg font-semibold text-fg-primary">{{ appName }}</div>
        <div class=" text-sm text-fg-secondary">{{ appVersion }} ({{ swVersion }})</div>
        <div class=" w-full mt-1 pl-1 rounded-md text-sm">{{ t('settings.comment') }}</div>
      </div>
    </div>
    <div class=" mt-4 p-2 bg-secondary rounded-md text-sm">
      <div class=" flex justify-between">
        <div class=" flex-1">{{ t('settings.local_cache_status') }}: {{ idbReady ? t('settings.ready') : t('settings.not_ready') }}</div>
      </div>
    </div>
    <div class=" mt-4 p-2">
      <div class=" flex justify-between w-full py-2 border-b border-border">
        <div>
          <span class=" icon-[solar--pallete-2-outline] text-xl align-middle mr-2"></span>
          <span>{{ t('settings.theme') }}</span>
        </div>
        <div>
          <button class=" px-2 py-1 text-sm rounded-md bg-secondary" @click="toggleTheme">{{ theme }}</button>
        </div>
      </div>
      <div class=" flex justify-between w-full py-2 border-b border-border">
        <div>
          <span class=" icon-[solar--sort-by-alphabet-outline] text-xl align-middle mr-2"></span>
          <span>{{ t('settings.language') }}</span>
        </div>
        <div>
          <select v-model="currentLocale" @change="changeLocale(currentLocale)" class=" rounded-md bg-secondary">
            <option v-for="(item, index) in langsMap" :key="index" :value="item.value">{{ item.label }}</option>
          </select>
        </div>
      </div>
      <RouteMenuItem v-for="item in menuList" :key="item.title" 
        :title="item.title" 
        :to-url="item.to" 
        :icon="item.icon"
        class=" border-b border-border last:border-0"
      />
    </div>
  </div>
</template>