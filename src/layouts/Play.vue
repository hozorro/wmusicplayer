<script setup lang="ts">
import PlayerBox from '@/components/PlayerBox.vue';
import PopMenu from '@/views/part/PopMenu.vue';
import AddToPlaylist from '@/views/part/AddToPlaylist.vue';
import { useOperationStore } from '@/store/music';

const store = useOperationStore();
</script>

<template>
  <div class=" relative mx-auto w-full min-h-svh text-gray-700">
    <RouterView />
    <div class="  w-full h-24 mt-4 text-center text-gray-400">This is the bottom.</div>
    <PlayerBox />
    <PopMenu v-model:ppm-visible="store.popMenuShow" :title="store.popMenuTitle" :pop-type="store.popMenuType" :operations="store.popMenuOperations" />
    <AddToPlaylist v-model:atp-visible="store.addToPlaylistShow" :id="store.addToPlaylistId" :title="store.addToPlaylistTitle" />
  </div>
</template>