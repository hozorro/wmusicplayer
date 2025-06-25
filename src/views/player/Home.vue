<script setup lang="ts">
import { ref } from 'vue'
import { useRequest } from 'alova/client';
import { useMusicStore } from '@/store/music';
import LatestAdded from '@/views/part/LatestAdded.vue';
import MostPlayed from '@/views/part/MostPlayed.vue';
import Header from '@/views/part/Header.vue';
import { getTopPlaylists, getTenArtists, getRandomGenres, getRandomTracks } from '@/apis/methods/music';
import { PlayChangeMode } from '@/constants/play-constants';

const curTab = ref(0)
const tabs = [
  {label:'最新添加',component: LatestAdded},
  {label:'最常播放',component: MostPlayed},
]
import DefaultPlaylistCover from '@/assets/imgs/playlist.png'
const { data: topPlaylists } = useRequest(getTopPlaylists)

const { data: artists } = useRequest(getTenArtists)
import defaultArtistArt from '@/assets/imgs/artist.png'

const { data: genres } = useRequest(getRandomGenres)

const store = useMusicStore()
function handlePlayRandom() {
  getRandomTracks(50).then(data => {
    store.addListToCurPlaylist(data, PlayChangeMode.REPLACE_LIST)
  })
}
</script>

<template>
  <Header />
  <div class=" px-2">
    <div class=" flex justify-between">
      <router-link to="/playlist" class=" text-lg font-semibold">歌单<span class=" icon-[solar--alt-arrow-right-linear] align-middle text-gray-600"></span></router-link>
      <div class=" flex-none">
        <router-link to="/favourite">
          <div class=" inline-block bg-cyan-700 text-white text-sm place-content-center px-2 rounded-md shadow-sm">FAV</div>
        </router-link>
        <div class=" inline-block bg-cyan-700 text-white text-sm place-content-center ml-2 px-1 rounded-md shadow-sm" @click="handlePlayRandom">RND50</div>
      </div>
    </div>
    <div class=" mt-2 flex flex-nowrap overflow-x-scroll">
      <template v-for="plist in topPlaylists">
        <div class=" flex-none w-1/4 mr-2 last:mr-0 rounded-md">
          <router-link :to="{name:'playlist',params:{id:plist.id},query:{back:'home'}}">
            <img :src="plist.cover" v-default-src="DefaultPlaylistCover" class=" w-full rounded-md object-cover aspect-square" />
            <div class=" text-sm text-gray-500">{{plist.name}}</div>
          </router-link>
        </div>
      </template>
    </div>
    <div class=" mt-3 flex justify-between">
      <router-link to="/artist" class=" text-lg font-semibold">歌手<span class=" icon-[solar--alt-arrow-right-linear] align-middle text-gray-600"></span></router-link to="/artist">
      <div class=" flex-none">
        <router-link :to="{name: 'folder', params: {id: 1}}" class=" inline-block bg-cyan-700 text-white text-sm place-content-center px-2 rounded-md shadow-sm">FOLDER</router-link>
      </div>
    </div>
    <div class=" mt-2 flex flex-nowrap overflow-x-scroll">
      <template v-for="artist in artists">
        <div class=" relative flex-none w-1/5 aspect-square mr-2 last:mr-0 bg-gray-200 rounded-md">
          <router-link :to="{name:'artist',params:{id:artist.id},query:{back:'home'}}">
            <img :src="artist.cover" v-default-src="defaultArtistArt" class=" w-full h-full object-cover rounded-md" />
            <div class=" absolute bottom-0 left-0 right-0 rounded-b-md px-1 bg-stone-300/50 backdrop-contrast-50 text-xs text-center truncate">{{ artist.name }}</div>
          </router-link>
        </div>
      </template>
    </div>
    <div class=" mt-3">
      <router-link to="/genre" class=" text-lg font-semibold">流派<span class=" icon-[solar--alt-arrow-right-linear] align-middle text-gray-600"></span></router-link>
    </div>
    <div class=" mt-2 flex flex-wrap gap-2">
      <router-link v-for="genre in genres" :to="{name:'genre',params:{id:genre.id}, query:{back:'home'}}">
        <div class=" flex-none h-10 leading-10 px-2 rounded-md text-stone-800" :style="`background-color:rgb(${genre.bgColor}););`">{{ genre.name }}</div>
      </router-link>
    </div>
    <div class=" mt-4 text-lg font-semibold">
      <button 
        v-for="(tab, index) in tabs" 
        :key="index" 
        :class="[' h-full w-24', {'border-b-2 border-b-cyan-600': curTab == index} ]" 
        @click="curTab = index">
        {{ tab.label }}
      </button>
    </div>
    <transition
      enter-from-class=" translate-x-full"
      enter-active-class="transition-all duration-100 ease-in-out"
      leave-active-class=" hidden"
    >
      <component :is="tabs[curTab].component" class=" mt-2" />
    </transition>
  </div>
</template>