<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { invalidateCache } from 'alova';
import { useRequest } from 'alova/client';
import { getPlaylists, addNewPlaylist, addTrackToPlaylist, getPlaylist } from '@/apis/methods/music';

const {id = '', title = ''} = defineProps<{id: string, title: string}>()
const addNewVisible = ref(false)
const newTitle = ref('')
const atpVisible = defineModel<boolean>('atpVisible', {default: false})

const { data: listData, send } = useRequest(getPlaylists, {
  initialData: [],
  immediate: false
})
// 已优化：只在显示时才请求歌单列表，否则每次只要有本组件的页面都会默认请求。
watchEffect(async () => { 
  if (atpVisible.value) await send()
})

async function onSelect(pid:string){
  console.log(pid, id)
  await addTrackToPlaylist(pid, id)
  invalidateCache(getPlaylist(pid))
  atpVisible.value = false
}

async function onAddNew(){
  const playlist = await addNewPlaylist(newTitle.value)
  if(playlist) {
    await addTrackToPlaylist(playlist.id, id)
    invalidateCache(getPlaylists())
    atpVisible.value = false
  }
}
</script>

<template>
  <teleport to="body">
    <div class=" fixed inset-0 bg-gray-800/50 z-80" v-show="atpVisible" @click="atpVisible = false"></div>
    <transition
      enter-from-class=" translate-y-full"
      leave-to-class="translate-y-full"
      enter-active-class="transition-all duration-300 ease-in-out"
      leave-active-class="transition-all duration-300 ease-in-out"
    >
      <div class=" absolute bottom-0 w-full z-90" v-bind="$attrs" v-show="atpVisible">
        <div class=" mx-1 p-2 bg-white rounded">
          <div class=" flex w-full justify-between items-center border-b-[1px] border-b-stone-200">
            <div class=" flex-1">
              收藏 <span class=" inline-block pb-1 align-middle text-cyan-700 max-w-[calc(100%-(--spacing(24)))] truncate"> {{ title }}</span> 到歌单
            </div>
            <div class=" flex-none cursor-pointer" @click="atpVisible = false">取消</div>
          </div>
          <div class=" ml-4 mt-2 cursor-pointer" @click="addNewVisible = true">新建歌单</div>
          <div class=" flex ml-8 my-2 justify-between gap-1" v-show="addNewVisible">
            <input type="text" v-model="newTitle" placeholder="歌单名称" class="flex-1" />
            <button class=" flex-none w-14" @click="onAddNew">确定</button>
            <button class=" flex-none w-14" @click="addNewVisible = false">取消</button>
          </div>
          <ul class=" ml-4 mt-2 pb-4">
            <li v-for="(pl, index) in listData" :key="index">
              <div class=" py-2 cursor-pointer" @click="onSelect(pl.id)">{{ pl.name }}</div>
            </li>
          </ul>
        </div>
      </div>
    </transition>
  </teleport>
</template>