<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { invalidateCache } from 'alova';
import { useRequest } from 'alova/client';
import { getPlaylists, addNewPlaylist, addTrackToPlaylist, getPlaylist, getTopPlaylists } from '@/apis/methods/music';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()

const {id = 0, title = ''} = defineProps<{id: number, title: string}>()
const addNewVisible = ref(false)
const newTitle = ref('')
const atpVisible = defineModel<boolean>('atpVisible', {default: false})

const { data: listData, send } = useRequest(getPlaylists, {
  initialData: [],
  immediate: false
})
// optimized: only request playlist list when visible
watchEffect(async () => { 
  if (atpVisible.value) await send()
})

async function onSelect(pid: number | string){
  await addTrackToPlaylist(pid, id)
  invalidateCache(getPlaylist(pid))
  atpVisible.value = false
}

async function onAddNew(){
  const playlist = await addNewPlaylist(newTitle.value)
  let pid: number | string
  if(playlist) {
    if (typeof playlist === 'string') pid = playlist  // local create new playlist returns id string
    else pid = playlist.id
    await addTrackToPlaylist(pid, id)
    invalidateCache([getPlaylists(), getTopPlaylists()])
    atpVisible.value = false
  }
}
</script>

<template>
  <teleport to="body">
    <div class=" fixed inset-0 bg-gray-800/50 z-90" v-show="atpVisible" @click="atpVisible = false"></div>
    <transition
      enter-from-class=" translate-y-full"
      leave-to-class="translate-y-full"
      enter-active-class="transition-all duration-300 ease-in-out"
      leave-active-class="transition-all duration-300 ease-in-out"
    >
      <div class=" fixed bottom-0 w-full z-90" v-bind="$attrs" v-show="atpVisible">
        <div class=" mx-1 p-2 bg-light dark:bg-teal-800 rounded text-gray-600 dark:text-teal-100">
          <div class=" flex w-full justify-between items-center border-b-[1px] border-b-stone-200">
            <div class=" flex-1">
              {{ t('playlist.favorite') }} 
              <span class=" inline-block pb-1 align-middle text-cyan-700 dark:text-teal-200 max-w-[calc(100%-(--spacing(24)))] truncate"> {{ title }}</span> 
              {{ t('playlist.to') }}
            </div>
            <div class=" flex-none cursor-pointer" @click="atpVisible = false">{{ t('common.cancel') }}</div>
          </div>
          <div class=" ml-4 mt-2 cursor-pointer" @click="addNewVisible = true">{{ t('playlist.create') }}</div>
          <div class=" flex ml-8 my-2 justify-between gap-1" v-show="addNewVisible">
            <input type="text" v-model="newTitle" :placeholder="t('playlist.title')" class="flex-1" />
            <button class=" flex-none w-14" @click="onAddNew">{{ t('common.confirm') }}</button>
            <button class=" flex-none w-14" @click="addNewVisible = false">{{ t('common.cancel') }}</button>
          </div>
          <ul class=" ml-4 mt-2 pb-4">
            <li v-for="(pl, index) in listData" :key="index">
              <div class=" py-2 cursor-pointer" @click="onSelect(pl.id)">{{ pl.title }}</div>
            </li>
          </ul>
        </div>
      </div>
    </transition>
  </teleport>
</template>