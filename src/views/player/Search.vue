<script setup lang="ts">
import { ref, computed, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { usePagination } from "alova/client";
import { useI18n } from "vue-i18n";
import { search } from "@/apis/methods/music";
import useTrackOperations from "@/composables/track-operations";
import useCollectionOperations from "@/composables/collection-operations";
import Header from "@/views/part/Header.vue";
import TrackItem from "@/components/TrackItem.vue";
import CollectionItem from "@/components/CollectionItem.vue";

const { t } = useI18n()

const route = useRoute();
const kw = computed(() => route.query.kw as string);
const tabs = ref([
  { name: t('player.track'), count: 0 },
  { name: t('player.artist'), count: 0 },
  { name: t('player.album'), count: 0 },
]);
const curTab = ref(0);
const lastKeys = ref<[string | null, string | null, string | null]>([null, null, null])
const clientHeight = document.documentElement.clientHeight
const pullDistance = 10

// Track
const { 
  data: tracks, 
  page: pageTrack, 
  isLastPage: isLastPageTrack, 
  onSuccess: onSuccessTrack
} = usePagination((page, pageSize) => {
  let lastKeyValue = lastKeys.value[0] == null ? null : encodeURIComponent(lastKeys.value[0]);
  return search<Track>('track', kw.value, page, pageSize, lastKeyValue)
}
, { 
  total: res => res.total,
  data: res => res.data,
  append: true,
  initialPage: 1,
  initialPageSize: 20,
  immediate: true,
  preloadNextPage: false,
  preloadPreviousPage: false,
  watchingStates: [kw],
  debounce: [0, 300, 0]
})
const { handleClick, handleOperation } = useTrackOperations()
onSuccessTrack(res => { 
  tabs.value[0].count = res.data.total
  if(res.data.next_key) {
    lastKeys.value[0] = res.data.next_key
  } else {
    lastKeys.value[0] = tracks.value.length > 0 ? tracks.value[tracks.value.length - 1].title : null
  }
})

// Artist
const { 
  data: artists, 
  page: pageArtist, 
  isLastPage: isLastPageArtist, 
  onSuccess: onSuccessArtist
} = usePagination((page, pageSize) => {
  let lastKeyValue = lastKeys.value[1] == null ? null : encodeURIComponent(lastKeys.value[1]);
  return search<Artist>('artist', kw.value, page, pageSize, lastKeyValue)
}, {
  total: res => res.total,
  data: res => res.data,
  append: true,
  initialPage: 1,
  initialPageSize: 20,
  immediate: true,
  preloadNextPage: false,
  preloadPreviousPage: false,
  watchingStates: [kw],
  debounce: [0, 300, 0]
})
const { handleOperation: handleArtistOperation } = useCollectionOperations('artist')
onSuccessArtist(res => { 
  tabs.value[1].count = res.data.total
  if(res.data.next_key) {
    lastKeys.value[1] = res.data.next_key
  } else {
    lastKeys.value[1] = artists.value.length > 0 ? artists.value[artists.value.length - 1].name : null
  }
})

//Album
const { 
  data: albums, 
  page: pageAlbum, 
  isLastPage: isLastPageAlbum, 
  onSuccess: onSuccessAlbum
} = usePagination((page, pageSize) => {
  let lastKeyValue = lastKeys.value[2] == null ? null : encodeURIComponent(lastKeys.value[2]);
  return search<Album>('album', kw.value, page, pageSize, lastKeyValue)
},{
  total: res => res.total,
  data: res => res.data,
  append: true,
  initialPage: 1,
  initialPageSize: 20,
  immediate: true,
  preloadNextPage: false,
  preloadPreviousPage: false,
  watchingStates: [kw],
  debounce: [0, 300, 0]
})
const { handleOperation: handleAlbumOperation } = useCollectionOperations('album')
onSuccessAlbum(res => { 
  tabs.value[2].count = res.data.total
  if(res.data.next_key) {
    lastKeys.value[2] = res.data.next_key
  } else {
    lastKeys.value[2] = albums.value.length > 0 ? albums.value[albums.value.length - 1].title : null
  }
})
const onPullUp = async () => { 
  let scrollTop = document.documentElement.scrollTop
  let scrollHeight = document.body.scrollHeight
  if (scrollTop + clientHeight >= scrollHeight + pullDistance) { 
    switch(curTab.value) {
      case 0:
        if(isLastPageTrack.value) return
        pageTrack.value++
        break;
      case 1:
        if(isLastPageArtist.value) return
        pageArtist.value++
        break;
      case 2:
        if(isLastPageAlbum.value) return
        pageAlbum.value++
        break;
    }
  }
}
window.addEventListener('scroll', onPullUp)
onUnmounted(() => {
  window.removeEventListener('scroll', onPullUp)
})
</script>

<template>
  <Header :init-kw="kw" />
  <div class=" px-2">
    <div class=" flex justify-start items-center">
      <div
        class=" w-24 mr-2 px-2 text-center"
        :class="{ 'font-semibold border-b-2 border-cyan-500': curTab === index }"
        v-for="(item, index) in tabs"
        :key="index"
        @click="curTab = index"
      >
        {{ item.name }} {{ item.count === 0 ? "" : `(${item.count})` }}
      </div>
    </div>
    <div class=" mt-4 w-full">
      <div v-if="curTab === 0">
        <div class=" w-full bg-stone-50 rounded-md p-2">
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
      </div>
      <div v-if="curTab === 1">
        <div class=" w-full bg-stone-50 rounded-md p-2">
          <div class=" flex items-center w-full" v-for="(artist,index) in artists">
            <div class=" flex-none w-6 text-center text-stone-500">{{ index + 1 }}</div>
            <CollectionItem class=" my-2"
              col-type="artist"
              :id="artist.id"
              :name="artist.name"
              :art="artist.cover"
              :query="{back:'search',kw: kw}"
              @operation="handleArtistOperation"
            />
          </div>
        </div>
      </div>
      <div v-if="curTab === 2">
        <div class=" w-full bg-stone-50 rounded-md p-2">
          <div class=" flex items-center w-full" v-for="(album,index) in albums">
            <div class=" flex-none w-6 text-center text-stone-500">{{ index + 1 }}</div>
            <CollectionItem class=" my-2"
              col-type="album"
              :id="album.id"
              :name="album.title"
              :art="album.cover"
              :query="{back:'search',kw: kw}"
              @operation="handleAlbumOperation"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>