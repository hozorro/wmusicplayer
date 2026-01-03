<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRequest } from 'alova/client';
import { useMusicStore } from '@/store/music';
import TrackListSlider from '@/views/part/TrackListSlider.vue';
import Header from '@/views/part/Header.vue';
import { getTopPlaylists, getTenArtists, getRandomGenres, getRandomTracks, getLatestTracks, getMostPlayedTracks } from '@/apis/methods/music';
import { getRandomHitsWeightedTracks } from '@/apis/methods/music';
import { PlayChangeMode } from '@/constants/play-constants';

import DefaultPlaylistCover from '@/assets/imgs/playlist.png'
import FavoriteListCover from '@/assets/imgs/favorite.png'
import FavoriteArtistsCover from '@/assets/imgs/fav_artists.png'
const { data: topPlaylists } = useRequest(getTopPlaylists)

const { data: artists } = useRequest(getTenArtists)
import defaultArtistArt from '@/assets/imgs/artist.png'

const { data: genres } = useRequest(getRandomGenres)

const { data: mostPlayedTracks } = useRequest(getMostPlayedTracks);
const { data: latestTracks } = useRequest(getLatestTracks);
const curTab = ref(0)
const tabs = [
  {label:'最新添加', component: TrackListSlider},
  {label:'最常播放', component: TrackListSlider},
]
const slideTracks = computed(() => {
  switch (curTab.value) {
    case 0:
      return latestTracks.value
    case 1:
      return mostPlayedTracks.value
    default:
      return latestTracks.value
  }
})

const store = useMusicStore()
function handlePlayRandom() {
  getRandomTracks(50).then(data => {
    store.addListToCurPlaylist(data, PlayChangeMode.REPLACE_LIST)
  })
}
function handlePlayRandomUsual() {
  getRandomHitsWeightedTracks(50, 5).then(res => {
    store.addListToCurPlaylist(res, PlayChangeMode.REPLACE_LIST)
  });
}
function switchTab(e: Event, index: number) {
  e.preventDefault();
  e.stopPropagation();
  curTab.value = index
}
</script>

<template>
  <Header />
  <div class=" px-2">
    <div>
      <router-link to="/playlist" class=" text-lg font-semibold">歌单<span class=" icon-[solar--alt-arrow-right-linear] align-middle text-gray-600"></span></router-link>
    </div>
    <div class=" mt-2 flex flex-nowrap overflow-x-scroll">
      <div class=" flex-none w-1/4 mr-2 last:mr-0 rounded-md">
        <router-link to="/favourite">
          <img :src="FavoriteListCover" class=" w-full rounded-md object-cover aspect-square" />
          <div class=" text-sm text-gray-500">我最喜欢</div>
        </router-link>
      </div>
      <template v-for="plist in topPlaylists">
        <div class=" flex-none w-1/4 mr-2 last:mr-0 rounded-md">
          <router-link :to="{name:'playlist',params:{id:plist.id},query:{back:'home'}}">
            <img :src="plist.cover" v-default-src="DefaultPlaylistCover" class=" w-full rounded-md object-cover aspect-square" />
            <div class=" text-sm text-gray-500">{{plist.title}}</div>
          </router-link>
        </div>
      </template>
    </div>
    <div class=" mt-3 flex justify-between bg-gray-200 rounded-md p-2">
      <div class=" flex-1 flex gap-1">
        <div class=" text-lg border border-cyan-500 text-gray-600 place-content-center px-2 rounded-md shadow-sm" @click="handlePlayRandom">
          <span class=" icon-[solar--magic-stick-3-outline] align-middle mr-1"></span>随机播放
        </div>
        <div class=" text-lg border border-cyan-500 text-gray-600 place-content-center px-2 rounded-md shadow-sm" @click="handlePlayRandomUsual">
          <span class=" icon-[solar--cup-music-outline] align-middle mr-1"></span>熟歌模式
        </div>
      </div>
      <RouterLink to="/random" class=" block flex-none text-lg text-gray-500">更多<span class=" icon-[solar--alt-arrow-right-linear] align-middle text-gray-600"></span></RouterLink>
    </div>
    <div class=" mt-3">
      <router-link to="/artist" class=" text-lg font-semibold">歌手<span class=" icon-[solar--alt-arrow-right-linear] align-middle text-gray-600"></span></router-link to="/artist">
    </div>
    <div class=" mt-2 flex flex-nowrap overflow-x-scroll">
      <template v-for="artist in artists">
        <div class=" relative flex-none w-1/5 aspect-square mr-2 bg-gray-200 rounded-md">
          <router-link :to="{name:'artist',params:{id:artist.id},query:{back:'home'}}">
            <img :src="artist.cover" v-default-src="defaultArtistArt" class=" w-full h-full object-cover rounded-md" />
            <div class=" absolute bottom-0 left-0 right-0 rounded-b-md px-1 bg-stone-300/50 backdrop-contrast-50 text-xs text-center truncate">{{ artist.name }}</div>
          </router-link>
        </div>
      </template>
      <div class=" flex-none w-1/5 aspect-square bg-gray-200 rounded-md">
        <router-link to="/artist/favorite">
          <img :src="FavoriteArtistsCover" class=" w-full h-full object-cover rounded-md" />
        </router-link>
      </div>
    </div>
    <div class=" mt-3">
      <router-link to="/genre" class=" text-lg font-semibold">流派<span class=" icon-[solar--alt-arrow-right-linear] align-middle text-gray-600"></span></router-link>
    </div>
    <div class=" mt-2 flex flex-wrap gap-2">
      <router-link v-for="genre in genres" :to="{name:'genre',params:{id:genre.id}, query:{back:'home'}}">
        <div class=" flex-none h-10 leading-10 px-2 rounded-md text-stone-800" :style="`background-color:${genre.color};`">{{ genre.name }}</div>
      </router-link>
    </div>
    <div class=" mt-4 text-lg font-semibold">
      <button 
        type="button"
        v-for="(tab, index) in tabs" 
        :key="index" 
        :class="[' h-full w-24', {'border-b-2 border-b-cyan-600': curTab == index} ]" 
        @click="switchTab($event, index)">
        {{ tab.label }}
      </button>
    </div>
    <div class=" relative overflow-hidden h-60">
      <transition
        mode="out-in"
        enter-from-class=" translate-x-full opacity-0"
        enter-active-class="  transition-transform transition-opacity duration-100 ease-in-out"
        leave-from-class=" opacity-1"
        leave-active-class=" transition-transform transition-opacity duration-100 ease-in-out"
        leave-to-class=" -translate-x-full opacity-0"
      >
        <div :key="curTab" class=" absolute inset-0">
          <component :is="tabs[curTab].component" :track-list="slideTracks" />
        </div>
      </transition>
    </div>
    <div class=" mt-3">
      <router-link :to="{name: 'folder', params: {id: 1}}" class=" text-lg font-semibold">文件夹<span class=" icon-[solar--alt-arrow-right-linear] align-middle text-gray-600"></span></router-link>
    </div>
  </div>
</template>