<script setup lang="ts">
import defaultArt from '@/assets/imgs/track.png'
interface ItemObject {
  id: string;
  title: string;
  art?: string;
  subInfo?: string;
  showArt?: boolean;
  showDelete?: boolean;
}
const { 
  id = '',
  title = '',
  art = '',
  subInfo = '',
  showArt = false,
  showDelete = false
} = defineProps<ItemObject>()

const emit = defineEmits<{
  itemClick: [track: Track],
  operation: [id: string, title: string]
}>()

</script>

<template>
  <div class=" flex w-full">
    <div v-if="showArt" class=" flex-none w-12 h-12 rounded-md">
      <img :src="art" v-default-src="defaultArt" class=" w-full h-full object-cover rounded-md" />
    </div>
    <div class=" flex-1 ml-2" @click="emit('itemClick', {id, title})">
      <div class=" w-full truncate">{{title}}</div>
      <div class=" mt-1 w-full text-sm text-stone-500 truncate">{{subInfo}}</div>
    </div>
    <div v-if="showDelete" class=" flex-none w-12 h-12 leading-12 text-center text-stone-300">
      <span class="icon-[solar--trash-bin-trash-linear]"></span>
    </div>
    <div class=" flex-none w-12 h-12 leading-12 text-center text-stone-500" @click="emit('operation', id, title)">
      <span class="icon-[solar--menu-dots-bold]"></span>
    </div>
  </div>
</template>