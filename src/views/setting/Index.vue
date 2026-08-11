<script setup lang="ts"> 
import { computed } from 'vue';
import { useMusicStore } from '@/store/music';
import { useTheme } from '@/composables/themes';
import { appInfo } from '@/constants/app-info';
import { idbReady } from '@/services/idb-state';
import RouteMenuItem from '@/components/RouteMenuItem.vue';
import { langsMap, loadLocaleMessages } from '@/i18n';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { theme, toggleTheme } = useTheme();

const appName = appInfo.VUE_APP_NAME
const appVersion = appInfo.VUE_APP_VERSION
const menuList = computed(() => {// must be computed, or the menu will not update when language changes
  const menuItems = [ 
    { title: t('settings.play.item'), to: '/setting/play', icon: 'icon-[solar--tuning-square-2-outline]' },
    { title: t('settings.localdb.item'), to: '/setting/sync', icon: 'icon-[solar--database-outline]' },
    { title: t('settings.help'), to: '/setting/help', icon: 'icon-[solar--notebook-bookmark-outline]' },
    { title: t('settings.test'), to: '/setting/test', icon: 'icon-[solar--flashlight-outline] origin-center rotate-180' },
    { title: t('settings.about.item'), to: '/setting/about', icon: 'icon-[solar--cassette-outline]' },
  ]
  const devItems = [
    { title: t('dev-runtime'), to: '/dev/runtime', icon: 'icon-[solar--test-tube-linear]' },
    { title: t('dev-player'), to: '/dev/player', icon: 'icon-[solar--play-stream-linear]' },
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
  <div class=" p-2">
    <div class=" flex justify-between">
      <router-link to="/" class=" flex-none text-lg font-semibold">
        <span class=" icon-[solar--alt-arrow-left-linear] align-middle text-fg-muted"></span>
      </router-link>
      <div class=" flex-1 text-lg font-semibold text-right">{{ t('settings.title') }}</div>
    </div>
    <div class=" mt-4 flex justify-between p-2">
      <div class=" flex-none">
        <img src="/favicon.svg" class=" w-18 h-18 rounded-md shadow" alt="logo" />
      </div>
      <div class=" flex-1 pl-4">
        <div class=" text-lg font-semibold text-fg-primary">{{ appName }}</div>
        <div class=" text-sm text-fg-secondary">{{ appVersion }}</div>
        <div class=" w-full mt-1 pl-1 rounded-md bg-secondary text-sm">{{ t('settings.comment') }}</div>
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