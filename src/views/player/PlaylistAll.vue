<script setup lang="ts">
import { ref, computed, useTemplateRef } from 'vue'
import { useMusicStore } from '@/store/music'
import { useRequest, useForm } from 'alova/client'
import { getPlaylists, addPlaylist} from '@/apis/methods/music'
import { addPlaylist as addPlaylistLocal, updateLocalMeta } from '@/apis/methods/idb-locals'
import DefaultCover from '@/assets/imgs/playlist.png'
import WMessage from '@/composables/message'

const { data: playlists, send: refreshList } = useRequest(getPlaylists)

const musicStore = useMusicStore()
const isShowCreate = ref(false)
function showCreate() {
  musicStore.playerBoxShow = false
  isShowCreate.value = true
}
function cancelCreate() {
  isShowCreate.value = false
  musicStore.playerBoxShow = true
}

const imgSrc = ref(DefaultCover)
const coverFile = useTemplateRef('coverFile')

function triggleCoverSelect() {
  if(!!coverFile.value){
    coverFile.value.click()
  }
}
function handleCoverChange(e: Event) {
  const target = e.target as HTMLInputElement
  if(target.files && target.files.length > 0){
    const coverSeleted = target.files[0]
    form.value.cover = coverSeleted
    const reader = new FileReader()
    reader.readAsDataURL(coverSeleted)
    reader.onload = function(e) {
      if(e.target){
        imgSrc.value = e.target.result as string
      }
    }
  }
}

const {
  loading,
  data: newPlaylist,
  form,
  send: submit,
  uploading,
  onSuccess,
  onError,
} = useForm(
  (data) => {
    const formData = new FormData()
    formData.append('title', data.title)
    formData.append('comment', data.comment)
    if(data.cover){
      formData.append('cover', data.cover)
    }
    return addPlaylist(formData)
  },
  {
    initialForm:{
      title: '',
      comment: '',
      cover: null as File | null
    },
    resetAfterSubmiting: true,
    immediate: false
  },
)

const progress = computed(() => {
  if(uploading.value.total > 0){
    return uploading.value.loaded / uploading.value.total * 100
  }
  return 0
})
onSuccess(() => {
  imgSrc.value = '/imgs/playlist-1.png'
  uploading.value.loaded = 0
  isShowCreate.value = false
  musicStore.playerBoxShow = true

  if (musicStore.isIDBReady) {
    setTimeout(() => {
      if(newPlaylist.value){
        addPlaylistLocal({
          id: newPlaylist.value.id,
          title: newPlaylist.value.title,
          cover: newPlaylist.value.cover,
          comment: newPlaylist.value.comment,
          created_at: newPlaylist.value.created_at,
          track_ids: [],
          hits: [],
          hit_count: 0
        }).then(() => {
          updateLocalMeta('playlist')
        })
      }
    }, 1000);
  }

  refreshList()
})
onError(() => {
  WMessage('创建失败', 'error')
})

function handleSubmit() {
  if(!form.value.title){
    WMessage('歌单名称不能为空', 'error')
    return
  }
  submit()
}

</script>

<template>
  <div class=" p-2">
    <div class=" flex justify-between">
      <router-link to="/" class=" flex-none text-lg font-semibold"><span class=" icon-[solar--alt-arrow-left-linear] align-middle text-gray-600"></span></router-link>
      <div class=" flex-1 text-lg font-semibold">歌单</div>
      <div class=" flex-none text-lg text-cyan-700" @click="showCreate">创建</div>
    </div>
    <div class=" mt-4 grid grid-cols-3 gap-3">
      <div v-for="plist in playlists">
        <router-link :to="`/playlist/${plist.id}`"> 
          <img :src="plist.cover" v-default-src="DefaultCover" class=" rounded-md object-cover aspect-square" />
          <div class=" text-sm text-gray-500">{{plist.title}}</div>
        </router-link>
      </div>
    </div>
  </div>
  <!-- 创建歌单 -->
  <transition
    enter-from-class=" translate-y-full"
    leave-to-class="translate-y-full"
    enter-active-class="transition-all duration-300 ease-in-out"
    leave-active-class="transition-all duration-300 ease-in-out"
  >
    <div class=" absolute bottom-0 left-0 w-full h-[calc(100%-(--spacing(12)))] rounded-t-2xl p-2 bg-white" v-show="isShowCreate">
      <div class=" flex justify-between">
        <div class="  flex-none text-lg text-amber-500" @click="cancelCreate">取消</div>
        <div class=" flex-1 text-lg text-center font-semibold">新建歌单</div>
        <div class="  flex-none text-lg text-cyan-700" @click="handleSubmit">
          <span v-if="loading" class="icon-[svg-spinners--3-dots-scale]"></span>
          <span v-else>提交</span>
        </div>
      </div>
      <div class=" p-2">
        <div class=" flex mt-4">
          <div class=" flex-none place-content-center">歌单名称：</div>
          <input type="text" v-model.trim="form.title" class=" w-full h-8 rounded-md bg-stone-100 px-2 focus:outline-0 focus:bg-stone-200" placeholder="请输入歌单名称" />
        </div>
        <div class=" mt-4">
          <div>封面图片：</div>
          <div class=" mt-2 mx-auto w-1/2 aspect-square" @click="triggleCoverSelect">
            <img :src="imgSrc" class="w-full h-full rounded-lg object-cover shadow-md" />
            <div class=" mx-2 w-[calc(100%-(--spacing(4)))] h-[2px]">
              <div class=" h-[2px] bg-cyan-500" :style="{width: progress + '%'}"></div>
            </div>
          </div>
          <input type="file" class=" hidden" ref="coverFile" @change="handleCoverChange" />
          <div class=" mt-1 mx-auto text-center text-xs text-stone-300">
            <span class="icon-[solar--info-circle-linear] align-middle"></span> 点击图片可更换
          </div>
        </div>
        <div class=" mt-4">
          <div>歌单简介：</div>
          <div class=" mt-2 w-full h-60">
            <textarea
              class="w-full h-full rounded-lg p-2 bg-stone-100 focus:outline-0 focus:bg-stone-200"
              v-model="form.comment"
              placeholder="请输入歌单简介"
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>