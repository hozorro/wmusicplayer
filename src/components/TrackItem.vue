<script setup lang="ts">
import { computed } from 'vue'
import defaultArt from '@/assets/imgs/track.png'
import { useMusicStore } from '@/store/music';
interface ItemObject {
  id: number;
  title: string;
  art?: string;
  subInfo?: string;
  showArt?: boolean;
  showDelete?: boolean;
  showPlaying?: boolean
}
const { 
  id = 0,
  title = '',
  art = '',
  subInfo = '',
  showArt = false,
  showDelete = false,
} = defineProps<ItemObject>()

const emit = defineEmits<{
  itemClick: [track: Track],
  operation: [id: number, title: string],
  delete: [id: number]
}>()
const store = useMusicStore()
const playing = computed(() => id == store.curPlaylist[store.curPlayIndex]?.id)
</script>

<template>
  <div class=" flex mb-2 last:mb-0 gap-2">
    <div v-if="showArt" class=" flex-none w-12 h-12 rounded-md">
      <img :src="art" v-default-src="defaultArt" class=" w-full h-full object-cover rounded-md" />
    </div>
    <div class=" flex-1 min-w-0 ml-1" @click="emit('itemClick', {id, title})">
      <div class=" flex w-full">
        <div v-if="playing" class=" flex-none icon-[svg-spinners--bars-scale-middle] mr-1 text-cyan-500 align-middle"></div>
        <div class=" flex-1 min-w-0 truncate">{{title}}</div>
      </div>
      <div class=" mt-1 text-sm text-stone-500 truncate">{{subInfo}}</div>
    </div>
    <div v-if="showDelete" class=" flex-none w-8 h-12 leading-12 text-center text-stone-500" @click="emit('delete', id)">
      <span class="icon-[solar--trash-bin-trash-linear]"></span>
    </div>
    <div class=" flex-none w-8 h-12 leading-12 text-center text-stone-500" @click="emit('operation', id, title)">
      <span class="icon-[solar--menu-dots-bold]"></span>
    </div>
  </div>
</template>