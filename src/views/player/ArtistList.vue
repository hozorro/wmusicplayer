<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import CollectionItem from '@/components/CollectionItem.vue';
import useCollectionOperations from '@/composables/collection-operations';
import { getArtistChars, getArtists } from '@/apis/methods/music';
import { useRequest } from 'alova/client';

const route = useRoute();
let artistChar = ref('')

const { data:artistChars,onSuccess } = useRequest(getArtistChars);
const { loading, error, data:arData, send:getArtistList } = useRequest((archar) => getArtists(archar),{
  immediate: false,
  initialData: {artists:[]}
});
onSuccess(()=>{
  if(route.query.char === undefined){
    let firstHasArtistChar = artistChars.value.find((charInfo) => charInfo.hasArtist)
    if (firstHasArtistChar){
      artistChar.value = firstHasArtistChar.charName
    }
  } else {
    artistChar.value = route.query.char as string
  }
  getArtistList(artistChar.value)
})
function switchArtists(char: string) { 
  artistChar.value = char
  getArtistList(char)
}
const { handleOperation } = useCollectionOperations('artist');
</script>

<template>
  <div class=" p-2 flex flex-col h-svh">
    <router-link to="/" class=" w-full flex-none text-lg font-semibold">
      <span class=" icon-[solar--alt-arrow-left-linear] align-middle text-gray-600"></span> 歌手
    </router-link>
    <div class=" mt-2 flex-none">
      <div class=" p-2 grid grid-cols-9 gap-2 w-full bg-white rounded-xl">
        <template v-for="achar in artistChars">
          <div v-if="achar.hasArtist && artistChar == achar.charName" class=" bg-cyan-700 text-white rounded-md p-1 aspect-square place-content-center">
            <div class=" text-center">{{ achar.charName }}</div>
          </div>
          <div v-else-if="achar.hasArtist" class=" bg-stone-200 text-stone-700 rounded-md p-1 aspect-square place-content-center" @click="switchArtists(achar.charName)">
            <div class=" text-center">{{ achar.charName }}</div>
          </div>
          <div v-else class=" bg-stone-100 text-stone-700 rounded-md p-1 aspect-square place-content-center"> 
            <div class=" text-center">{{ achar.charName }}</div>
          </div>
        </template>
      </div>
    </div>
    <div class=" mt-4 flex-1">
      <div class=" w-full h-full overflow-y-scroll">
        <div v-if="loading">{{loading}}</div>
        <div v-else-if="error">{{error.message}}</div>
        <div v-else>
          <CollectionItem  v-for="artist in arData.artists" 
            col-type="artist"
            :id="artist.id"
            :name="artist.name"
            :art="artist.cover"
            :query="{back:'artist-list',char:artistChar}"
            @operation="handleOperation"
          />
        </div>
      </div>
    </div>
  </div>
</template>