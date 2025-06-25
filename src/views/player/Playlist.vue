<script setup lang="ts">
import { ref, computed, useTemplateRef } from "vue";
import { useRoute } from "vue-router";
import { invalidateCache } from "alova";
import { useRequest, useForm } from "alova/client";
import { useMusicStore } from "@/store/music";
import { shuffle } from "@/utilies/general";
import TrackItem from "@/components/TrackItem.vue";
import { useColorEffect } from "@/composables/color-effect";
import useTrackOperations from "@/composables/track-operations";
import { getPlaylist, editPlaylist } from "@/apis/methods/music";
import defaultArt from "@/assets/imgs/playlist.png";
import { PlayChangeMode } from "@/constants/play-constants";

const imgRef = useTemplateRef("coverImg");
const { bgColor, scrollOut } = useColorEffect(imgRef, defaultArt)

const route = useRoute()
const {data: playlist, send: getData} = useRequest(() => getPlaylist(route.params.id as string),{
  initialData: { id: '',name: '', tracks: [] }
})
const { handleClick, handleOperation } = useTrackOperations()

function handlePlayAll(){
  musicStore.addListToCurPlaylist(playlist.value.tracks, PlayChangeMode.REPLACE_LIST)
}
function handlePlayRandom(){
  const tracks = [...playlist.value.tracks]
  shuffle(tracks)
  musicStore.addListToCurPlaylist(tracks, PlayChangeMode.REPLACE_LIST)
}

// 编辑歌单
const musicStore = useMusicStore()
const isShowEdit = ref(false)
const imgSrc = ref('')
const coverFile = useTemplateRef('coverFile')
function showEdit() {
  musicStore.playerBoxShow = false
  imgSrc.value = playlist.value.cover
  form.value.name = playlist.value.name
  form.value.comment = playlist.value.comment
  isShowEdit.value = true
}
function cancelEdit() {
  isShowEdit.value = false
  musicStore.playerBoxShow = true
}
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
  form,
  send: submit,
  uploading,
  onSuccess,
  onError,
} = useForm(
  (data) => {
    const formData = new FormData()
    formData.append('id', playlist.value.id)
    formData.append('name', data.name)
    formData.append('comment', data.comment)
    if(data.cover){
      formData.append('cover', data.cover)
    }
    return editPlaylist(formData)
  },
  {
    initialForm:{
      name: '',
      comment: '',
      cover: null as File | null
    },
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
  uploading.value.loaded = 0
  isShowEdit.value = false
  invalidateCache(getPlaylist(playlist.value.id))
  getData()
  musicStore.playerBoxShow = true
})
onError(() => {
  alert('创建失败')
})
function handleSubmit() {
  if(!form.value.name){
    alert('歌单名称不能为空')
    return
  }
  submit()
}
const backLink = computed(() => {
  let backQuery = {...route.query}
  if (route.query.back) delete backQuery.back
  return { name: route.query.back as string || 'playlist', query: backQuery };
});
</script>

<template>
  <div class=" fixed flex justify-between w-full top-0 left-0 p-2 z-30" 
    :style="{
      background: scrollOut ? '#f3f4f6' : 'transparent',
      borderBottom: scrollOut ? '1px solid #d1d2d4' : 'none'}">
    <router-link :to="backLink" class=" flex-none" :style="{color: scrollOut ? '#364153' : '#f5f5f4'}">
      <span class=" icon-[solar--alt-arrow-left-linear] align-middle text-2xl mix-blend-difference"></span>
      <span class=" align-middle">{{scrollOut ? '歌单：' + playlist.name : '歌单'}}</span>
    </router-link>
    <div class=" text-stone-200" :style="{display: scrollOut ? 'block' : 'none'}">
      <div class=" inline-block bg-cyan-700 text-white text-sm place-content-center px-2 rounded-md shadow-sm" @click="handlePlayAll">播放全部</div>
      <div class=" inline-block bg-cyan-700 text-white text-sm place-content-center ml-2 px-1 rounded-md shadow-sm" @click="handlePlayRandom">随机播放</div>
    </div>
  </div>
  <div class=" w-full min-h-full" :style="bgColor">
    <div class=" flex pt-12 px-3 w-full">
      <div class=" flex-none w-1/3">
        <img :src="playlist.cover" v-default-src="defaultArt" class=" w-full aspect-square object-cover rounded-md" ref="coverImg" />
      </div>
      <div class=" flex-1 flex flex-col justify-between ml-4">
        <div class=" flex-none">
          <div class=" text-lg font-bold mr-2 text-stone-100">{{ playlist.name }}
            <span class=" text-stone-300 icon-[solar--gallery-edit-linear] align-middle" @click="showEdit"></span>
          </div>
          <div class=" text-sm text-stone-200">
            <span class=" mr-1 align-middle icon-[solar--calendar-linear]"></span>
            <span class=" align-middle">{{ playlist.created }}</span> 
            <span class=" ml-2 mr-1 align-middle icon-[solar--music-notes-linear]"></span>
            <span class=" align-middle">{{ playlist.tracks.length }}</span>
          </div>
        </div>
        <div class=" flex-1 flex justify-around items-center mt-2">
          <button class=" btn" @click="handlePlayAll">播放全部</button>
          <button class=" btn" @click="handlePlayRandom">随机播放</button>
        </div>
      </div>
    </div>
    <div class=" mt-2 mx-3 rounded-md p-2 text bg-stone-300/10 text-stone-200">{{ playlist.comment ? playlist.comment : '沉默是金...' }}</div>
    <div class=" w-full mt-4 p-2 bg-gray-100 rounded-t-lg">
      <div class=" flex items-center w-full" v-for="(track,index) in playlist.tracks">
        <div class=" flex-none w-6 text-center text-stone-500">{{ index + 1 }}</div>
        <TrackItem
          :id="track.id"
          :title="track.title"
          :sub-info="track.artists?.join(', ')"
          :show-art="true"
          :art="track.cover"
          @item-click="handleClick"
          @operation="handleOperation"
          class=" my-2"
        />
      </div>
    </div>
  </div>
  <!-- 编辑歌单 -->
  <div class=" absolute bottom-0 left-0 w-full h-[calc(100%-(--spacing(12)))] rounded-t-2xl p-2 bg-white" v-show="isShowEdit">
    <div class=" flex justify-between">
      <div class="  flex-none text-lg text-amber-500" @click="cancelEdit">取消</div>
      <div class=" flex-1 text-lg text-center font-semibold">编辑歌单</div>
      <div class="  flex-none text-lg text-cyan-700" @click="handleSubmit">
        <span v-if="loading" class="icon-[svg-spinners--3-dots-scale]"></span>
        <span v-else>提交</span>
      </div>
    </div>
    <div class=" p-2">
      <div class=" flex mt-4">
        <div class=" flex-none place-content-center">歌单名称：</div>
        <input type="text" v-model.trim="form.name" class=" w-full h-8 rounded-md bg-stone-100 px-2 focus:outline-0 focus:bg-stone-200" placeholder="请输入歌单名称" />
      </div>
      <div class=" mt-4">
        <div>封面图片：</div>
        <div class=" mt-2 mx-auto w-1/2 aspect-square" @click="triggleCoverSelect">
          <img :src="imgSrc" v-default-src="defaultArt" class="w-full h-full rounded-lg object-cover shadow-md" />
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
</template>