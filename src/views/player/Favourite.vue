<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { useRoute } from "vue-router";
import { useRequest } from "alova/client";
import TrackItem from "@/components/TrackItem.vue";
import { useColorEffect } from "@/composables/color-effect";
import useTrackOperations from "@/composables/track-operations";
import { getFavoriteTracks } from "@/apis/methods/music";
import defaultArt from "@/assets/imgs/fav.png";

const imgRef = useTemplateRef("coverImg");
const { bgColor, scrollOut } = useColorEffect(imgRef, defaultArt)

const route = useRoute()
const {data: favTracks} = useRequest(() => getFavoriteTracks())
const { handleClick, handleOperation } = useTrackOperations()

const backLink = computed(() => {
  let backQuery = {...route.query}
  if (route.query.back) delete backQuery.back
  return { name: route.query.back as string || 'home', query: backQuery };
});
</script>

<template>
  <div class=" fixed flex justify-between w-full top-0 left-0 p-2 z-30" 
    :style="{
      background: scrollOut ? '#f3f4f6' : 'transparent',
      borderBottom: scrollOut ? '1px solid #d1d2d4' : 'none'}">
    <router-link :to="backLink" class=" flex-none" :style="{color: scrollOut ? '#364153' : '#f5f5f4'}">
      <span class=" icon-[solar--alt-arrow-left-linear] align-middle text-2xl mix-blend-difference"></span>
      <span class=" align-middle">{{scrollOut ? '我最喜欢的音乐' : ''}}</span>
    </router-link>
    <div class=" text-stone-200" :style="{display: scrollOut ? 'block' : 'none'}">
      <div class=" inline-block bg-cyan-700 text-white text-sm place-content-center px-2 rounded-md shadow-sm">播放全部</div>
      <div class=" inline-block bg-cyan-700 text-white text-sm place-content-center ml-2 px-1 rounded-md shadow-sm">随机播放</div>
    </div>
  </div>
  <div class=" w-full min-h-full" :style="bgColor">
    <div class=" flex pt-12 px-3 w-full">
      <div class=" flex-none w-1/3">
        <img :src="defaultArt" class=" w-full aspect-square object-cover rounded-md" ref="coverImg" />
      </div>
      <div class=" flex-1 flex flex-col justify-between ml-4">
        <div class=" flex-none">
          <div class=" text-lg font-bold mr-2 text-stone-100">我最喜欢的音乐</div>
          <div class=" text-sm text-stone-200">
            <span class=" ml-2 mr-1 align-middle icon-[solar--music-notes-linear]"></span>
            <span class=" align-middle">{{ favTracks.length }}</span>
          </div>
        </div>
        <div class=" flex-1 flex justify-around items-center mt-2">
          <button class=" btn">播放全部</button>
          <button class=" btn">随机播放</button>
        </div>
      </div>
    </div>
    <div class=" w-full mt-4 p-2 bg-gray-100 rounded-t-lg">
      <div class=" flex items-center w-full" v-for="(track,index) in favTracks">
        <div class=" flex-none w-6 text-center text-stone-500">{{ index + 1 }}</div>
        <TrackItem
          :id="track.id"
          :title="track.title"
          :sub-info="track.artists?.join(', ')"
          :show-art="true"
          :art="track.cover"
          @item-click="handleClick"
          @operation="handleOperation"
          class=" my-2"
        />
      </div>
    </div>
  </div>
</template>