<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSync } from '@/composables/sync'
import dayjs from 'dayjs'

const optInfo = ref('Ready.')

const {
  musicSyncInfos,
  playbackSyncInfos,
  initialLocalDbPlaybackMetaInfo,
  refreshLocalDbPlaybackMetaInfo,
  getLocalDbMetaInfo,
  getServerDbMetaInfo,
  syncMusicEntityData,
  syncAllMusicEntityData,
  uploadTrackHitData,
  uploadPlaylistHitData,
  syncFavData,
  downloadTrackHitData,
  downloadArtistHitData,
  downloadPlaylistHitData,
  uploadPlaylists,
  downloadPlaylists
} = useSync(optInfo)

onMounted(() => { 
  refreshLocalDbPlaybackMetaInfo().then(() => getLocalDbMetaInfo())
})

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

async function checkUpdate() {
  try {
    optInfo.value += '\nBegin to check server data...'
    await getServerDbMetaInfo()
  } catch (error) {
    optInfo.value += '\nError, try again later.'
  }
}

async function rebuildLocalData() {
  optInfo.value += '\nBegin to rebuild local database...'
  await getServerDbMetaInfo()
  try {
    await syncAllMusicEntityData()
    await initialLocalDbPlaybackMetaInfo()
    await postIdbReadyMessage()
  }catch (error) { 
    optInfo.value += '\nError, try again later.'
  }
}

async function syncAll() {
  await syncAllMusicEntityData()
}

const playbackSyncMethodMap = {
  trackhit: async () => {await uploadTrackHitData(); await downloadTrackHitData()},
  playlisthit: async () => {await uploadPlaylistHitData(); await downloadPlaylistHitData()},
  artisthit: async () => {await downloadArtistHitData()},
  trackfav: async() => syncFavData('track'),
  artistfav: async() => syncFavData('artist'),
  playlist: async () => {await uploadPlaylists(); await downloadPlaylists()},
}
</script>

<template>
    <div class=" p-2">
      <div class=" flex justify-between">
        <router-link to="/setting" class=" flex-none text-lg font-semibold"><span class=" icon-[solar--alt-arrow-left-linear] align-middle text-gray-600"></span></router-link>
        <div class=" flex-1 text-lg font-semibold text-right">本地数据库(IndexedDb)</div>
      </div>
      <div class=" mt-4">
        <div class=" bg-gray-200 rounded-md p-2 text-xs">
          <div class=" border-b border-gray-300 pb-1">
            <span class=" icon-[solar--hand-stars-outline] align-middle"></span>
            <span class=" ml-2 align-middle font-semibold">本地数据库使用说明</span>
          </div>
          <p class=" mt-1 indent-6">基于IndexedDb构建本地数据库缓存所有音乐信息数据，除了播放音乐外，其他所有内容均无需连接服务器，可离线操作。如果服务器音乐数据库有变化，需点击下面的按钮手动更新同步（会先同步上传本地变化）。</p>
        </div>
      </div>
    </div>
    <div class=" w-full p-2">
      <table class=" table-auto w-full">
        <thead>
          <tr class=" border-b">
            <th class=" px-2 py-1" width="16%">数据表</th>
            <th class=" px-2 py-1" width="42%">本地数量</th>
            <th class=" px-2 py-1" width="42%">服务器数量</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(value, key, index) in musicSyncInfos" :key="index">
            <td class=" px-2 py-1">{{ key }}</td>
            <td class=" py-1 text-center">
              <div v-if="value.syncing" class=" w-full relative text-center bg-cyan-50 rounded-sm text-amber-500">
                {{ `${value.syncProgress}%` }}
                <div class=" absolute top-0 left-0 h-full bg-cyan-500 rounded-sm opacity-50" :style="{width: `${value.syncProgress}%`}"></div>
              </div>
              <div v-else>
                <div class=" text-sm">{{ value.countLocal }}</div>
                <div class=" text-[0.5rem]">{{ dayjs(value.versionLocal).format('YY-MM-DD HH:mm') }}</div>
              </div>
            </td>
            <td class=" py-1 text-center">
              <div class=" text-sm">{{ value.countServer }}</div>
              <div class=" text-[0.5rem]">{{ dayjs(value.versionServer).format('YY-MM-DD HH:mm') }}</div>
            </td>
            <td class=" px-2 py-1 text-center">
              <span v-if="value.syncing" class=" icon-[solar--refresh-square-bold-duotone]"></span>
              <span 
                v-else-if="value.countServer !== 0 && value.countLocal !== value.countServer" 
                class=" icon-[solar--refresh-square-bold] text-cyan-500" 
                @click="syncMusicEntityData(key, true)">
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class=" flex justify-between w-full p-2">
      <button class=" px-2 block h-8 bg-cyan-600 text-white rounded-md" @click="rebuildLocalData">重建数据</button>
      <button class=" px-2 block h-8 bg-cyan-600 text-white rounded-md" @click="checkUpdate">检查更新</button>
      <button class=" px-2 block h-8 bg-cyan-600 text-white rounded-md" @click="syncAll">同步全部</button>
    </div>
    <div class=" w-full p-2 mt-2 border-t border-t-gray-200">
      <table class=" table-auto w-full">
        <thead>
          <tr class=" border-b">
            <th class=" px-2 py-1" width="16%">数据表</th>
            <th class=" px-2 py-1" width="42%">本地版本</th>
            <th class=" px-2 py-1" width="42%">服务器版本</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(value, key, index) in playbackSyncInfos" :key="index">
            <td class=" px-2 py-1 text-sm">{{ key }}</td>
            <td class=" py-1 text-center">
              <div v-if="value.syncing" class=" w-full relative text-center bg-cyan-50 rounded-sm text-amber-500">
                syncing...
              </div>
              <div v-else>
                <div class=" text-sm">{{ value.countLocal }}</div>
                <div class=" text-[0.5rem]">{{ dayjs(value.versionLocal).format('YY-MM-DD HH:mm') }}</div>
              </div>
            </td>
            <td class=" py-1 text-center">
              <div class=" text-sm">{{ value.countServer }}</div>
              <div class=" text-[0.5rem]">{{ dayjs(value.versionServer).format('YY-MM-DD HH:mm') }}</div>
            </td>
            <td class=" px-2 py-1 text-center">
              <span v-if="value.syncing" class=" icon-[solar--refresh-square-bold-duotone]"></span>
              <span v-else 
                class=" icon-[solar--refresh-square-bold] text-cyan-500" 
                @click="playbackSyncMethodMap[key]()">
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class=" w-full h-40 my-2 p-2 overflow-y-auto">
      <div class=" h-full p-2 bg-gray-200 rounded-md whitespace-pre-wrap text-xs overflow-y-auto">{{ optInfo }}</div>
    </div>
</template>