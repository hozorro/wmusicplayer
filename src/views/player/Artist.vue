<script setup lang="ts">
import { ref, computed, onMounted, useTemplateRef } from "vue";
import { useRequest } from "alova/client";
import { useRoute } from "vue-router";
import { useMusicStore } from "@/store/music";
import TrackItem from "@/components/TrackItem.vue";
import CollectionItem from "@/components/CollectionItem.vue";
import useCollectionOperations from '@/composables/collection-operations';
import useTrackOperations from '@/composables/track-operations';
import { getArtist, getArtistRandomTracks, getCollectionTracks } from "@/apis/methods/music";

import { PlayChangeMode } from "@/constants/play-constants";

const banner = useTemplateRef<HTMLImageElement>("banner");
const artistNav = ref('')
import defaultArtSketch from '@/assets/imgs/portrait_sketch.png'
const route = useRoute()
const store = useMusicStore()
const { data: artist } = useRequest(getArtist(route.params.id as string),{
    initialData: {
      cover: defaultArtSketch,
      top20_tracks: [],
      album_list: [],
  }
})
function handlePlayTop() {
  store.addListToCurPlaylist(artist.value.top20_tracks, PlayChangeMode.REPLACE_LIST)
}
function handlePlayRandom() {
  getArtistRandomTracks(route.params.id as string).then(data => {
    store.addListToCurPlaylist(data, PlayChangeMode.REPLACE_LIST)
  })
}
function handlePlayAll() {
  getCollectionTracks(route.params.id as string, 'artist').then(data => {
    store.addListToCurPlaylist(data, PlayChangeMode.REPLACE_LIST)
  })
}
onMounted(() => {
  window.addEventListener('scroll', function(){
    if(banner !== null){
      const rect = banner.value?.getBoundingClientRect();
      if (rect !== undefined && rect.bottom < 0){
        artistNav.value = artist.value.name
      } else {
        artistNav.value = ''
      }
    }
  })
})

const tab = ref<'tracks'|'albums'>('tracks')

import defaultArt from '@/assets/imgs/portrait.png'

const { handleOperation: handleAlbumOperation } = useCollectionOperations('album');
const { handleClick, handleOperation: handleTrackOperation } = useTrackOperations();

function handleOperation(oType: string, oId: string | number, oTitle: string) {
  if (oType === 'album') {
    handleAlbumOperation(oId as number, oTitle);
  } else {
    handleTrackOperation(oId as string, oTitle);
  }
}
const backLink = computed(() => {
  let backQuery = {...route.query}
  if (route.query.back) delete backQuery.back
  return { name: route.query.back as string, query: backQuery };
});
</script>

<template>
  <div class=" fixed top-0 left-0 mt-2 px-2 z-30">
    <router-link :to="backLink">
      <span class=" icon-[solar--alt-arrow-left-linear] align-middle text-2xl mix-blend-difference"></span>{{artistNav}}
    </router-link>
  </div>
  <div class=" w-full min-h-full">
    <div class=" w-full aspect-2/1">
      <img :src="artist.cover" v-default-src="defaultArt" class=" w-full h-full object-cover" ref="banner" />
    </div>
    <div class=" -mt-4 -mb-6 mx-4 h-16 bg-stone-50 shadow-md rounded-md p-2 relative z-20 text-center">
      <div class=" text-lg">{{ artist.name }}</div>
      <div class=" text-sm text-stone-400">已收录{{ artist.album_count }}张专辑，{{ artist.track_count }}首歌</div>
    </div>
    <div class=" sticky top-0 px-2 pt-9 bg-gray-100 z-10">
      <div class=" flex justify-around mt-2">
        <button class=" px-2 h-8 leading-8 bg-cyan-600 text-white rounded-md" @click="handlePlayTop">播放热门</button>
        <button class=" px-2 h-8 leading-8 bg-cyan-600 text-white rounded-md" @click="handlePlayRandom">随机播放</button>
        <button class=" px-2 h-8 leading-8 bg-cyan-600 text-white rounded-md" @click="handlePlayAll">播放全部</button>
      </div>
      <div class=" mt-4 pb-2 text-lg">
        <div class=" inline-block" @click="tab = 'tracks'" :class="tab == 'tracks' ? 'border-b-2 border-b-cyan-600' : ''">歌曲</div>
        <div class=" inline-block ml-4" @click="tab = 'albums'" :class="tab == 'albums' ? 'border-b-2 border-b-cyan-600' : ''">专辑</div>
      </div>
    </div>
    <div v-show="tab == 'tracks'" class=" p-2 w-full">
      <TrackItem v-for="track in artist.top20_tracks"
        :id="track.id"
        :title="track.title"
        :art="track.cover"
        :show-art="true"
        :sub-info="track.artists?.join(', ')"
        @item-click="handleClick"
        @operation="(id:string, title:string) => handleOperation('track', id, title)"
      />
    </div>
    <div v-show="tab == 'albums'" class=" p-2 w-full">
      <CollectionItem v-for="album in artist.album_list"
        col-type="album"
        :id="album.id"
        :name="album.name"
        :cover="album.cover"
        @operation="(id:string|number, name:string) => handleOperation('album', id, name)"
      />
    </div>
  </div>
</template>