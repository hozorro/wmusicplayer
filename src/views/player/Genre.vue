<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useMusicStore } from '@/store/music'
import { usePagination } from 'alova/client';
import { useI18n } from 'vue-i18n';
import TrackItem from '@/components/TrackItem.vue';
import useTrackOperations from '@/composables/track-operations';
import { getGenre, getGenreTracks, getGenreRandomTracks } from '@/apis/methods/music';
import { PlayChangeMode } from '@/constants/play-constants';

const { t } = useI18n()

const genreName = ref('')
const route = useRoute()
const store = useMusicStore()
getGenre(route.params.id as string).then(res => {
  genreName.value = res.name
})
const lastKey = ref<string | null>(null)
const { 
  data: tracks, 
  total, 
  page,
  isLastPage,
  onSuccess: pageUpdated
} = usePagination((page, pageSize) => {
  let lastKeyValue = lastKey.value == null ? null : encodeURIComponent(lastKey.value);
  return getGenreTracks(route.params.id as string, page, pageSize, lastKeyValue)
},{
  total: res => res.total,
  data: res => res.tracks,
  append: true,
  initialPage: 1,
  initialPageSize: 20,
  immediate: true,
  preloadPreviousPage: false,
  preloadNextPage: false
})
pageUpdated(res => {
  if(res.data.next_key) {
    lastKey.value = res.data.next_key
  } else {
    lastKey.value = tracks.value.length > 0 ? tracks.value[tracks.value.length - 1].title : null
  } 
})

const clientHeight = document.documentElement.clientHeight
const pullDistance = 10
let debounceTimer: NodeJS.Timeout | null = null
const onPullUp = async () => {
  if(debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    let scrollTop = document.documentElement.scrollTop
    let scrollHeight = document.body.scrollHeight
    if (scrollTop + clientHeight >= scrollHeight + pullDistance) { 
      if(isLastPage.value) return
      page.value++
    }
    debounceTimer = null
  }, 300)
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
  getGenreRandomTracks(parseInt(route.params.id as string)).then(data => {
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
      <span class=" icon-[solar--alt-arrow-left-linear] align-middle text-2xl"></span>{{ t('player.genre') }}: {{ genreName }} ({{ total }})
    </router-link>
    <div class=" mt-2 p-2 flex justify-between border-b-stone-200 border-b">
      <button class=" px-2 h-8 block bg-cyan-600 text-white rounded-md" @click="handlePlayAll">{{ t('player.playall') }}</button>
      <button class=" px-2 h-8 block bg-cyan-600 text-white rounded-md" @click="handlePlayRandom">{{ t('player.randomplay') }}</button>
      <button class=" px-2 h-8 block bg-cyan-600 text-white rounded-md" @click="handleAddPlay">{{ t('player.addplay') }}</button>
    </div>
  </div>
  <div class=" mt-24 p-2">
    <div class=" flex items-center w-full" v-for="(track,index) in tracks">
      <div class=" flex-none w-6 text-center text-stone-500">{{ index + 1 }}</div>
      <div class=" flex-1 min-w-0">
        <TrackItem class=" my-2"
        :id="track.id"
        :title="track.title"
        :sub-info="track.artists?.join(', ')"
        @item-click="handleClick"
        @operation="handleOperation"
        />
      </div>
    </div>
  </div>
</template>