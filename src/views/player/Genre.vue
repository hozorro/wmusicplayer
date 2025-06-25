<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useMusicStore } from '@/store/music'
import { usePagination } from 'alova/client';
import TrackItem from '@/components/TrackItem.vue';
import useTrackOperations from '@/composables/track-operations';
import { getGenre, getGenreTracks, getGenreRandomTracks } from '@/apis/methods/music';
import { PlayChangeMode } from '@/constants/play-constants';

const genreName = ref('')
const route = useRoute()
const store = useMusicStore()
getGenre(route.params.id as string).then(res => {
  genreName.value = res.name
})
const { 
  data: tracks, 
  total, 
  page,
  isLastPage,
} = usePagination((page, pageSize) => getGenreTracks(route.params.id as string, page, pageSize),{
  total: res => res.total,
  data: res => res.tracks,
  append: true,
  initialPage: 1,
  initialPageSize: 10,
  immediate: true
})

const clientHeight = document.documentElement.clientHeight
const pullDistance = 10
function onPullUp() { 
  let scrollTop = document.documentElement.scrollTop
  let scrollHeight = document.body.scrollHeight
  if (scrollTop + clientHeight >= scrollHeight + pullDistance) {
    if(isLastPage.value) return
    page.value++
  }
}
window.addEventListener('scroll', onPullUp)
onUnmounted(() => {
  window.removeEventListener('scroll', onPullUp)
})

const { handleClick, handleOperation } = useTrackOperations()

function handlePlayAll() {
  store.addListToCurPlaylist(tracks.value, PlayChangeMode.REPLACE_LIST)
}
function handlePlayRandom() { 
  getGenreRandomTracks(route.params.id as string).then(data => {
    store.addListToCurPlaylist(data, PlayChangeMode.REPLACE_LIST)
  })
}
function handleAddPlay() {
  store.addListToCurPlaylist(tracks.value, PlayChangeMode.ADD_LIST_LAST)
}

const backLink = computed(() => {
  let backQuery = {...route.query}
  if (route.query.back) delete backQuery.back
  return { name: route.query.back as string || 'genre', query: backQuery };
});
</script>

<template>
  <div class=" fixed top-0 left-0 p-2 bg-gray-100 w-full z-20">
    <router-link :to="backLink">
      <span class=" icon-[solar--alt-arrow-left-linear] align-middle text-2xl"></span>流派：{{ genreName }} ({{ total }})
    </router-link>
    <div class=" mt-2 p-2 flex justify-around border-b-stone-200 border-b">
      <button class=" px-2 h-8 leading-8 bg-cyan-600 text-white rounded-md" @click="handlePlayAll">播放全部</button>
      <button class=" px-2 h-8 leading-8 bg-cyan-600 text-white rounded-md" @click="handlePlayRandom">随机播放</button>
      <button class=" px-2 h-8 leading-8 bg-cyan-600 text-white rounded-md" @click="handleAddPlay">添加播放</button>
    </div>
  </div>
  <div class=" mt-24 p-2">
    <div class=" flex items-center w-full" v-for="(track,index) in tracks">
      <div class=" flex-none w-6 text-center text-stone-500">{{ index + 1 }}</div>
      <TrackItem class=" my-2"
        :id="track.id"
        :title="track.title"
        :sub-info="track.artists?.join(', ')"
        @item-click="handleClick"
        @operation="handleOperation"
      />
    </div>
  </div>
</template>