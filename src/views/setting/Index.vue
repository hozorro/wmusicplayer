<script setup lang="ts"> 
import { ref, onMounted } from 'vue';
import { useMusicStore } from '@/store/music';
import MenuItem from '@/components/MenuItem.vue';
import { appInfo } from '@/constants/app-info';

const appName = appInfo.VUE_APP_NAME
const appVersion = appInfo.VUE_APP_VERSION
const menuList = [
  { title: '播放设置', to: '/setting/play', icon: 'icon-[solar--tuning-square-2-outline]' },
  { title: '本地数据库', to: '/setting/localdb', icon: 'icon-[solar--database-outline]' },
  { title: '帮助', to: '/setting/help', icon: 'icon-[solar--notebook-bookmark-outline]' },
  { title: '试验', to: '/setting/test', icon: 'icon-[solar--flashlight-outline] origin-center rotate-180' },
  { title: '关于...', to: '/setting/about', icon: 'icon-[solar--cassette-outline]' },
];

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
const { idbHelper } = useMusicStore();
async function getLocalStatus() {
  if (!('caches' in window)) return;

  const cache = await caches.open('pwa-state');
  const response = await cache.match('/__db_ready');
  isIDBReady.value = response ? (await response.text()) == 'true' : false;
}

async function getLocalMetaInfo() {
  const metaList = await idbHelper.getAll<IMeta<keyof MetaInfo>>('meta')
  console.log(metaList)
  metaList.forEach(meta => {
    dbMeta.value[meta.name] = meta.total_count
  })
}

async function postIdbReadyMessage() {
  if (!('caches' in window)) return;

  const cache = await caches.open('pwa-state');
  await cache.put('/__db_ready', new Response('true', {
    headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }
  }));
  if('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({type: 'IDB_Ready'})
  }
}

onMounted(() => {
  getLocalStatus();
  getLocalMetaInfo();
});
</script>

<template>
  <div class=" p-2">
    <div class=" flex justify-between">
      <router-link to="/" class=" flex-none text-lg font-semibold"><span class=" icon-[solar--alt-arrow-left-linear] align-middle text-gray-600"></span></router-link>
      <div class=" flex-1 text-lg font-semibold text-right">设置</div>
    </div>
    <div class=" mt-4 flex justify-between p-2">
      <div class=" flex-none">
        <img src="/favicon.svg" class=" w-18 h-18 rounded-md shadow" alt="logo" />
      </div>
      <div class=" flex-1 pl-4">
        <div class=" text-lg font-semibold">{{ appName }}</div>
        <div class=" text-sm text-gray-500">{{ appVersion }}</div>
        <div class=" w-full mt-1 pl-1 rounded-md bg-gray-200 text-sm text-gray-500">有个性的音乐播放器，来自wEyEco</div>
      </div>
    </div>
    <div class=" mt-4 p-2 bg-gray-200 rounded-md text-sm">
      <div class=" flex justify-between">
        <div class=" flex-1">本地缓存状态：{{ isIDBReady ? '就绪' : '为空' }}</div>
        <div class=" flex-none text-cyan-500" @click="postIdbReadyMessage">{{ isIDBReady ? '刷新' : '初始化' }}</div>
      </div>
      <div class=" mt-1 ml-4 flex justify-between">
        <div class=" flex-1">目录：{{ dbMeta.folder }}</div>
        <div class=" flex-1">歌曲：{{ dbMeta.track }}</div>
      </div>
      <div class=" mt-1 ml-4 flex justify-between">
        <div class=" flex-1">歌手：{{ dbMeta.artist }}</div>
        <div class=" flex-1">专辑：{{ dbMeta.album }}</div>
      </div>
      <div class=" mt-1 ml-4 flex justify-between">
        <div class=" flex-1">流派：{{ dbMeta.genre }}</div>
        <div class=" flex-1">歌单：{{ dbMeta.playlist }}</div>
      </div>
    </div>
    <div class=" mt-4 p-2">
      <MenuItem v-for="item in menuList" :key="item.title" 
        :title="item.title" 
        :to-url="item.to" 
        :icon="item.icon"
        class=" border-b border-gray-200 last:border-0"
      />
    </div>
  </div>
</template>