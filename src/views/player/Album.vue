<script setup lang="ts">
import { ref, computed, useTemplateRef, onMounted } from "vue";
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
const { bgColor, scrollOut, refresh } = useColorEffect(imgRef, defaultArt)

const artists = computed(() => {
  return album.value.artists.map(a => a.name).join(',')
})

// import albumSketch from "@/assets/imgs/album_sketch.png";
const { data: album, onSuccess } = useRequest(getAlbum(parseInt(route.params.id as string)),{
  initialData: {
    id: '',
    name: '',
    artists: [],
    track_count: 0,
    tracks: [],
  }
})
onSuccess(async (res) => {
  if (!res.data.cover) res.data.cover = defaultArt
  setTimeout(() => refresh(), 300)
})

const { handleClick, handleOperation } = useTrackOperations()

function handlePlayAll() {
  getCollectionTracks(parseInt(route.params.id as string), 'album').then(data => {
    store.addListToCurPlaylist(data, PlayChangeMode.REPLACE_LIST)
  })
}
function handlePlayRandom() {
  const tracks = [...album.value.tracks]
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

const needShowMoreArtists = ref(false)
const showMoreArtists = ref(false)
const artistsIconDiv = useTemplateRef('artistsIconDiv')
const allArtistsDiv = useTemplateRef('allArtistsDiv')

onMounted(() => {
  if (artistsIconDiv.value && allArtistsDiv.value) {
    const height = artistsIconDiv.value.getBoundingClientRect().height
    const allHeight = allArtistsDiv.value.getBoundingClientRect().height
    if (allHeight > height) {
      needShowMoreArtists.value = true
    }
  }
})
</script>

<template>
  <div class=" fixed flex items-center top-2 left-0 right-0 z-30" 
    :style="{
      background: scrollOut ? '#f3f4f6' : 'transparent',
      borderBottom: scrollOut ? '1px solid #d1d2d4' : 'none'}">
    <div class=" flex-none">
      <RouterLink :to="backLink"><span class=" icon-[solar--alt-arrow-left-linear] align-middle text-2xl mix-blend-difference"></span></RouterLink>
    </div>
    <div class=" flex-1 min-w-0 align-middle truncate mix-blend-difference"><RouterLink :to="backLink">{{scrollOut ? '专辑：' + album.title : '专辑'}}</RouterLink></div>
    <div class=" flex-none text-stone-200" :class="{'hidden': !scrollOut}">
      <span class=" bg-cyan-700 text-white text-sm px-2 rounded-md shadow-sm" @click="handlePlayAll">播放全部</span>
      <span class=" bg-cyan-700 text-white text-sm mx-2 px-1 rounded-md shadow-sm" @click="handlePlayRandom">随机播放</span>
    </div>
  </div>
  <div class=" w-full min-h-full" :style="bgColor">
    <div class=" flex pt-12 px-2 w-full">
      <div class=" flex-1 w-32 flex flex-col justify-between">
        <div class=" flex-none pl-2">
          <div class=" w-full text-lg font-bold text-stone-100 truncate">{{ album.title || '' }}</div>
          <div class=" w-full flex text-sm text-stone-300 items-start">
            <div class=" py-1" ref="artistsIconDiv">
              <span class=" align-middle icon-[solar--user-speak-linear]"></span>
            </div>
            <div class=" flex-1 flex relative min-w-0 align-middle">
              <div class=" flex-1 min-w-0 p-1 truncate">{{ artists }}</div>
              <div class=" flex-none text-cyan-500 py-1" v-if="needShowMoreArtists" v-show="!showMoreArtists" @click="showMoreArtists = true">更多</div>
              <div class=" absolute top-0 left-0 right-0 max-h-48 overflow-y-auto p-1 rounded-md text-wrap bg-cyan-50 shadow" 
                ref="allArtistsDiv" 
                :class="{'visible': showMoreArtists, 'invisible': !showMoreArtists}"
                :style="bgColor">
                {{ artists }} <span class=" ml-2 text-cyan-500" @click="showMoreArtists = false">收起</span>
              </div>
            </div>
          </div>
          <div class=" mt-2 text-sm text-stone-300">
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
      <div class=" flex items-center w-full" v-for="(track,index) in album.tracks">
        <div class=" flex-none w-6 text-center text-stone-500">{{ index + 1 }}</div>
        <TrackItem
          :id="track.id"
          :title="track.title"
          :sub-info="track.artists?.join(', ')"
          @item-click="handleClick"
          @operation="handleOperation"
          class=" my-2 flex-1 min-w-0"
        />
      </div>
    </div>
  </div>
</template>