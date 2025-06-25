<script setup lang="ts">
import { computed } from 'vue';
import { getAssetImg } from '@/utilies/general';

interface ItemObject {
  colType: 'folder' | 'artist' | 'genre' | 'playlist' | 'album';
  id: string | number;
  name: string;
  art?: string;
  subInfo?: string;
  query?: { [key: string]: string };
}
const { 
  colType = '',
  id = 0,
  name = '',
  subInfo = '',
  art = '',
  query = {}
} = defineProps<ItemObject>()

const defaultArt = computed(() => {
  switch (colType) {
    case 'folder':
      return getAssetImg('folderc.png')
    case 'artist':
      return getAssetImg('artist.png')
    case 'album':
      return getAssetImg('album.png')
    case 'genre':
      return getAssetImg('genrec.png')
    default:
      return ''
  }
}) 

const emit = defineEmits<{
  operation: [id: string | number, name: string]
}>()
</script>

<template>
  <div class=" flex w-full mb-2 last:mb-0 items-center">
    <div class=" flex-none w-12 h-12 rounded-md">
      <img :src="art" v-default-src="defaultArt" class=" w-full h-full object-cover rounded-md" />
    </div>
    <router-link :to="{name: colType, params: {id: id}, query: query}" class=" flex-1 ml-2 align-middle">
      <div class=" w-full truncate">{{name}}</div>
      <div class=" mt-1 w-full text-sm text-stone-500 truncate">{{subInfo}}</div>
    </router-link>
    <div class=" flex-none w-12 h-12 leading-12 text-center text-stone-500" @click="emit('operation', id, name)">
      <span class="icon-[solar--menu-dots-bold]"></span>
    </div>
  </div>
</template>