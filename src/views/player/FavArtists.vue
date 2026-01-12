<script setup lang="ts">
import { useRequest } from 'alova/client';
import { getFavoritedArtists } from '@/apis/methods/music';
import defaultArtistArt from '@/assets/imgs/artist.png'

const { data: artists } = useRequest(getFavoritedArtists);
</script>

<template>
  <div class=" p-2">
    <div>
      <router-link to="/" class=" flex-none text-lg font-semibold"><span class=" icon-[solar--alt-arrow-left-linear] align-middle text-gray-600"></span></router-link>
    </div>
    <div class=" mt-4 grid grid-cols-3 gap-3">
      <div v-for="artist in artists">
        <router-link :to="`/artist/${artist.id}`"> 
          <img :src="artist.cover" v-default-src="defaultArtistArt" class=" rounded-md w-full object-cover aspect-square" />
          <div class=" text-sm text-gray-500">{{artist.name}}</div>
        </router-link>
      </div>
    </div>
  </div>
</template>