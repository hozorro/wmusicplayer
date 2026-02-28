<script setup lang="ts">
import { ref, computed, onMounted, useTemplateRef } from "vue";
import { useRequest } from "alova/client";
import { useRoute } from "vue-router";
import { useMusicStore } from "@/store/music";
import { useI18n } from "vue-i18n";
import TrackItem from "@/components/TrackItem.vue";
import CollectionItem from "@/components/CollectionItem.vue";
import useCollectionOperations from '@/composables/collection-operations';
import useTrackOperations from '@/composables/track-operations';
import { getArtist, getArtistRandomTracks, getCollectionTracks } from "@/apis/methods/music";
import { PlayChangeMode } from "@/constants/play-constants";

const { t } = useI18n();

const banner = useTemplateRef<HTMLImageElement>("banner");
const artistNav = ref('')
import defaultArtSketch from '@/assets/imgs/portrait_sketch.jpg'
const route = useRoute()
const store = useMusicStore()

const artist_id = ref(parseInt(route.params.id as string))
const { data: artist } = useRequest(getArtist(artist_id.value),{
    initialData: {
      cover: defaultArtSketch,
      top_tracks: [],
      main_albums: [],
      track_albums: []
  }
})
function handlePlayTop() {
  store.addListToCurPlaylist(artist.value.top_tracks, PlayChangeMode.REPLACE_LIST)
}
function handlePlayRandom() {
  getArtistRandomTracks(artist_id.value).then(data => {
    store.addListToCurPlaylist(data, PlayChangeMode.REPLACE_LIST)
  })
}
function handlePlayAll() {
  getCollectionTracks(artist_id.value, 'artist').then(data => {
    store.addListToCurPlaylist(data, PlayChangeMode.REPLACE_LIST)
  })
}
const tab = ref<'tracks'|'albums'>('tracks')
onMounted(() => {
  if (route.query.tab == 'albums') tab.value = 'albums'
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

import defaultArt from '@/assets/imgs/portrait.jpg'

const { handleOperation: handleAlbumOperation } = useCollectionOperations('album');
const { handleClick, handleOperation: handleTrackOperation } = useTrackOperations();

function handleOperation(oType: string, oId: string | number, oTitle: string) {
  if (oType === 'album') {
    handleAlbumOperation(oId as number, oTitle);
  } else {
    handleTrackOperation(oId as number, oTitle);
  }
}
const backLink = computed(() => {
  let backQuery = {...route.query}
  if (route.query.back) {
    delete backQuery.back
    return { name: route.query.back as string || 'artist-list', query: backQuery };
  } else {
    return { name: 'artist-list', query: {char: artist.value.pinyin_initial} };
  }
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
    <div class=" -mt-4 -mb-6 mx-4 h-16 bg-stone-50 dark:bg-teal-800 shadow-md rounded-md p-2 relative z-20 text-center">
      <div class=" text-lg">{{ artist.name }}</div>
      <div class=" text-sm text-stone-400">
        {{ t('player.artist_stats', {
          main_album_count: artist.main_albums.length, 
          track_album_count: artist.track_albums.length, 
          track_count: artist.track_count}) }}
      </div>
    </div>
    <div class=" sticky top-0 px-2 pt-9 bg-light dark:bg-dark z-10">
      <div class=" flex justify-around mt-2">
        <button class=" px-2 h-8 leading-8 bg-cyan-600 text-white rounded-md" @click="handlePlayTop">{{ t('player.playhot') }}</button>
        <button class=" px-2 h-8 leading-8 bg-cyan-600 text-white rounded-md" @click="handlePlayRandom">{{ t('player.randomplay') }}</button>
        <button class=" px-2 h-8 leading-8 bg-cyan-600 text-white rounded-md" @click="handlePlayAll">{{ t('player.playall') }}</button>
      </div>
      <div class=" mt-4 pb-2 text-lg">
        <div class=" inline-block" @click="tab = 'tracks'" :class="tab == 'tracks' ? 'border-b-2 border-b-cyan-600' : ''">{{ t('player.track') }}</div>
        <div class=" inline-block ml-4" @click="tab = 'albums'" :class="tab == 'albums' ? 'border-b-2 border-b-cyan-600' : ''">{{ t('player.album') }}</div>
      </div>
    </div>
    <div v-show="tab == 'tracks'" class=" p-2 w-full">
      <TrackItem v-for="track in artist.top_tracks"
        :id="track.id"
        :title="track.title"
        :art="track.cover"
        :show-art="true"
        :sub-info="track.artists?.join(', ')"
        @item-click="handleClick"
        @operation="(id:number, title:string) => handleOperation('track', id, title)"
      />
    </div>
    <div v-show="tab == 'albums'" class=" p-2 w-full">
      <CollectionItem v-for="album in artist.main_albums"
        col-type="album"
        :id="album.id"
        :name="album.title"
        :art="album.cover"
        :query="{back: 'artist', id: artist.id.toString(),tab: 'albums'}"
        @operation="(id:string|number, name:string) => handleOperation('album', id, name)"
      />
    </div>
    <div v-show="tab == 'albums'" class=" p-2 w-full">
      <div class=" w-full mb-2 border-t border-t-gray-200"></div>
      <CollectionItem v-for="album in artist.track_albums"
        col-type="album"
        :id="album.id"
        :name="album.title"
        :art="album.cover"
        :query="{back: 'artist', id: artist.id.toString(),tab: 'albums'}"
        @operation="(id:string|number, name:string) => handleOperation('album', id, name)"
      />
    </div>
  </div>
</template>