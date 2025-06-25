<script setup lang="ts">
import { ref, computed, useTemplateRef } from 'vue';
import { useColorEffect } from '@/composables/color-effect';
import { useMusicStore } from '@/store/music';
import { secToHMS } from '@/utilies/general';
import { usePlayer } from '@/composables/player'
import useTrackOperations from '@/composables/track-operations';
import trackCover from '@/assets/imgs/track_art.png'

defineOptions({ inheritAttrs: false })
const storeMusic = useMusicStore()
const showSimple = ref<boolean>(true)
const coverImg = useTemplateRef('coverImg')
const audioRef = useTemplateRef('audioRef')
const { bgColor, refresh } = useColorEffect(coverImg, trackCover)
const {
  track,
  playStatus,
  playInfo,
  audioList,
  seqOrder,
  handleTimeUpdate,
  playAudio,
  playNext,
  playPrev,
  playEnded,
  playRemove,
  handleOrder,
  handleStar,
  playlistItemClick
} = usePlayer(audioRef, refresh)
const progressWrap = useTemplateRef('progressWrap')
const progress = useTemplateRef('progress')
const progress_s = useTemplateRef('progress_s')
const curTime = ref('00:00')
const duration = computed(() => secToHMS(track.duration || 0))
const artists = computed(() => {
  if(!track.artists) return
  return track.artists.map(a => a.name).join(',')
});
const playIcon_s = computed(() => playStatus.value ? 'icon-[solar--pause-bold]' : 'icon-[solar--play-bold]')
const playIcon = computed(() => playStatus.value ? 'icon-[solar--pause-circle-bold]' : 'icon-[solar--play-circle-bold]')
const seqOrderIcon = ['icon-[solar--repeat-linear]', 'icon-[solar--shuffle-linear]', 'icon-[solar--repeat-one-linear]']
const playlistShow = ref(false)

function playing(){
  if(audioRef.value){
    curTime.value = secToHMS(audioRef.value.currentTime)
    let playedPortion = audioRef.value.currentTime / audioRef.value.duration
    let offsetLeft = playedPortion * (progressWrap.value?.offsetWidth || 0)
    if(progress.value) progress.value.style.width = offsetLeft + 'px'
    if(progress_s.value) progress_s.value.style.width = (playedPortion * 100) + '%'
    if(playedPortion > storeMusic.getParam('stat_percent') / 100 && !playInfo.playHitsChecked){
      // updateHit('track',track.id)
      // for (const ar of track.artists) {
      //   updateHit('artist', ar.id)
      // }
      playInfo.playHitsChecked = true
    }
  }
}
function onTimeUpdate(){
  handleTimeUpdate(playing)
}
function switchFav(){
  track.starred = !track.starred
}
function hidePlaylist(){
  playlistShow.value = false
}
const { handleCurPlaylistOperation } = useTrackOperations()

</script>

<template>
  <div v-show="storeMusic.playerBoxShow">
    <div v-show="showSimple" class=" fixed bottom-6 left-2 w-[calc(100%-(--spacing(4)))] h-12 z-50 bg-white rounded-3xl shadow-lg">
      <div class="flex">
        <div class=" flex-none w-12 h-12">
          <img :src="track.cover" v-default-src="trackCover" class="w-full h-full rounded-3xl" />
        </div>
        <div class=" flex-1 ml-2 w-0" @click="showSimple = false">
          <div class=" w-full">
            <div class=" truncate">{{ track.title }}</div>
            <div class=" text-gray-400 text-sm truncate">{{ artists }}</div>
          </div>
        </div>
        <div class=" flex-none mr-4">
          <span class=" inline-block h-12 align-middle ml-4 text-2xl" :class="playIcon_s" @click="playAudio"></span>
          <span class=" inline-block icon-[solar--skip-next-bold] h-12 align-middle ml-4 text-2xl"></span>
        </div>
      </div>
      <div class=" w-[calc(100%-(--spacing(12)))] mx-auto -mt-[2px] h-[2px]">
        <div class=" w-0 h-[2px] bg-cyan-500" ref="progress_s"></div>
      </div>
    </div>
    <div v-show="!showSimple" class=" fixed bottom-0 left-0 w-full h-svh z-50 p-2" :style="bgColor">
      <div class=" flex  text-stone-50">
        <div class=" flex-none" @click="showSimple = true"><span class="icon-[solar--alt-arrow-down-linear] text-2xl"></span></div>
        <div class=" flex-1 text-center text-lg">歌曲 | 歌词</div>
        <div class=" flex-none text-lg mr-2">
          <span class="icon-[solar--menu-dots-bold]"></span>
        </div>
      </div>
      <div class=" flex justify-center items-center w-full aspect-square overflow-hidden text-center align-middle">
        <img :src="track.cover" class=" w-2/3 aspect-square object-cover rounded-md" ref="coverImg" />
      </div>
      <div class=" w-full flex justify-between items-center p-2 text-stone-50">
        <div class=" flex-1">
          <div class=" text-lg truncate">{{ track.title }}</div>
          <div class=" text-gray-200 text-sm truncate">{{ artists }}</div>
        </div>
        <div class=" flex-none">
          <span class=" icon-[solar--heart-linear] align-middle text-xl" @click="handleStar(track.starred, switchFav)"></span>
          <span class=" ml-4 icon-[solar--add-circle-linear] align-middle text-xl"></span>
        </div>
      </div>
      <div class=" px-2 mt-4">
        <div class=" relative w-full h-5 pt-2">
          <div class=" w-full h-1 bg-stone-300" ref="progressWrap"></div>
          <div class=" absolute top-2 left-0 w-full h-1 bg-stone-50" ref="progress"></div>
        </div>
        <div class=" flex justify-between text-sm">
          <div class=" flex-none text-stone-50">{{ curTime }}</div>
          <div class=" flex-none text-stone-50">{{ duration }}</div>
        </div>
      </div>
      <div class=" w-full flex justify-around items-center mt-8">
        <span class=" text-2xl text-stone-50" :class="seqOrderIcon[seqOrder]" @click="handleOrder"></span>
        <span class=" icon-[solar--skip-previous-bold] text-2xl text-stone-50" @click="playPrev"></span> 
        <span class=" text-5xl text-stone-50" :class="playIcon" @click="playAudio"></span>
        <span class=" icon-[solar--skip-next-bold] text-2xl text-stone-50" @click="playNext"></span>
        <span class=" icon-[solar--playlist-2-bold] text-2xl text-stone-50" @click="playlistShow = !playlistShow"></span>
      </div>
    </div>
    <div class=" fixed bottom-0 w-full max-h-72 z-50" v-show="playlistShow">
        <div class=" mx-2 p-2 min-h-96 bg-white rounded-lg">
          <div class=" flex justify-between items-center border-b-[1px] border-b-gray-300 py-2">
            <div>当前播放列表</div>
            <div class=" text-cyan-500" @click="playlistShow = false">关闭</div>
          </div>
          
          <div class=" max-h-60 overflow-y-auto">
            <div v-for="(trk, idx) in audioList" :key="idx" class=" flex justify-between items-center py-1">
              <div class=" flex-none w-10 text-center">{{ idx + 1 }}</div>
              <div class=" flex-1  hover:cursor-pointer truncate" @click="playlistItemClick(idx,hidePlaylist)">
                  {{ trk.title }}
              </div>
              <span class=" inline-block h-8 flex-none text-xl icon-[solar--trash-bin-trash-linear] hover:cursor-pointer" @click="playRemove(trk.id)"></span>
              <span class=" inline-block h-8 flex-none text-xl ml-2 icon-[solar--menu-dots-bold] hover:cursor-pointer" @click="handleCurPlaylistOperation(trk.id, trk.title)"></span>
            </div>
          </div>
        </div>
      </div>
  </div>
  <audio ref="audioRef" v-bind="$attrs" @timeupdate="onTimeUpdate" @ended="playEnded"></audio>
</template>