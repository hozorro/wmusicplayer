<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { useRoute } from "vue-router";
import { useMusicStore } from "@/store/music"
import { useRequest } from "alova/client";
import TrackItem from "@/components/TrackItem.vue";
import { useColorEffect } from "@/composables/color-effect";
import { getAlbum, getCollectionTracks } from "@/apis/methods/music";
import useTrackOperations from '@/composables/track-operations';
import { shuffle } from "@/utilies/general";
import { PlayChangeMode } from "@/constants/play-constants";
import defaultArt from '@/assets/imgs/album_art.png'

const route = useRoute();
const store = useMusicStore();
const imgRef = useTemplateRef("coverImg");
const { bgColor, scrollOut } = useColorEffect(imgRef, defaultArt)

import albumSketch from "@/assets/imgs/album_sketch.png";
const { data: album } = useRequest(getAlbum(route.params.id as string),{
    initialData: {
      cover: albumSketch,
      artists: [{id:'', name: ''}],
      track_list: [],
  }
})
const { handleClick, handleOperation } = useTrackOperations()

function handlePlayAll() {
  getCollectionTracks(route.params.id as string, 'album').then(data => {
    store.addListToCurPlaylist(data, PlayChangeMode.REPLACE_LIST)
  })
}
function handlePlayRandom() {
  const tracks = [...album.value.track_list]
  shuffle(tracks)
  store.addListToCurPlaylist(tracks, PlayChangeMode.REPLACE_LIST)
}
const backLink = computed(() => {
  let backQuery = {...route.query}
  if (route.query.back == 'artist') {
    delete backQuery.back
    return { name: 'artist', params: { id: route.query.id as string }, query: backQuery }
  } else {
    if (route.query.back) delete backQuery.back
    return { name: route.query.back as string || 'album-list', query: backQuery }
  }
});
</script>

<template>
  <div class=" fixed flex justify-between w-full top-0 left-0 p-2 z-30" 
    :style="{
      background: scrollOut ? '#f3f4f6' : 'transparent',
      borderBottom: scrollOut ? '1px solid #d1d2d4' : 'none'}">
    <router-link :to="backLink" class=" flex-none" :style="{color: scrollOut ? '#364153' : '#f5f5f4'}">
      <span class=" icon-[solar--alt-arrow-left-linear] align-middle text-2xl mix-blend-difference"></span>
      <span class=" align-middle">{{scrollOut ? '专辑：' + album.name : '专辑'}}</span>
    </router-link>
    <div class=" text-stone-200" :style="{display: scrollOut ? 'block' : 'none'}">
      <div class=" inline-block bg-cyan-700 text-white text-sm place-content-center px-2 rounded-md shadow-sm" @click="handlePlayAll">播放全部</div>
      <div class=" inline-block bg-cyan-700 text-white text-sm place-content-center ml-2 px-1 rounded-md shadow-sm" @click="handlePlayRandom">随机播放</div>
    </div>
  </div>
  <div class=" w-full min-h-full" :style="bgColor">
    <div class=" flex pt-12 px-2 w-full">
      <div class=" flex-1 flex flex-col justify-between">
        <div class=" flex-none pl-2">
          <div class=" text-lg font-bold text-stone-100">{{ album.name }}</div>
          <div class=" text-sm text-stone-300">
            <span class=" mr-1 align-middle icon-[solar--user-speak-linear]"></span>
            <span class=" align-middle">{{ album.artists.map(a => a.name).join(',') }}</span>
          </div>
          <div class=" mt-1 text-sm text-stone-300">
            <span class=" mr-1 align-middle icon-[solar--music-notes-linear]"></span>
            <span class=" align-middle">共{{ album.track_count }}首歌</span>
          </div>
        </div>
        <div class=" flex-1 flex justify-around items-center mt-2">
          <button class=" btn" @click="handlePlayAll">播放全部</button>
          <button class=" btn" @click="handlePlayRandom">随机播放</button>
        </div>
      </div>
      <div class=" flex-none w-7/15">
        <img :src="album.cover" class=" w-25/34 aspect-square object-cover rounded-md inline-block" ref="coverImg" />
        <img src="@/assets/imgs/album_part.png" class=" w-4/17 inline-block" />
      </div>
    </div>
    <div class="  w-full mt-4 p-2 bg-gray-100 rounded-t-lg">
      <div class=" flex items-center w-full" v-for="(track,index) in album.track_list">
        <div class=" flex-none w-6 text-center text-stone-500">{{ index + 1 }}</div>
        <TrackItem
          :id="track.id"
          :title="track.title"
          :sub-info="track.artists?.join(', ')"
          @item-click="handleClick"
          @operation="handleOperation"
          class=" my-2"
        />
      </div>
    </div>
  </div>
</template>