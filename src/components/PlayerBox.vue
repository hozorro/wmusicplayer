<script setup lang="ts">
import { ref, computed, useTemplateRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMusicStore } from '@/store/music';
import useTrackOperations from '@/composables/track-operations';
import { useColorEffect } from '@/composables/color-effect';
import { usePlayer } from '@/composables/player'
import { secToHMS } from '@/utilies/general';
import { parseHits } from "@/utilies/time-text"
import trackCover from '@/assets/imgs/track_art.jpg'

defineOptions({ inheritAttrs: false })

const { t } = useI18n()
const storeMusic = useMusicStore()
const showSimple = ref<boolean>(true)
const coverImg = useTemplateRef('coverImg')
const audioRef = useTemplateRef('audioRef')
const lyricContainerRef = useTemplateRef('lyricContainer')
const { bgColor, refresh } = useColorEffect(coverImg, trackCover)
const {
  track,
  hitsInfo,
  loadHitsInfo,
  lyrics,
  lyricInfo,
  setLyricLineRef,
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
  handleFav,
  artistsFavStatus,
  artistsFavs,
  artistsFavsShow,
  fetchArtistsFavStatus,
  handleArtistFavs,
  handleArtistFavSelected,
  playlistItemClick
} = usePlayer(audioRef, lyricContainerRef, refresh)
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
const favoritedTrackIcon = computed(() => track.favorited_at ? 'icon-[solar--heart-bold]' : 'icon-[solar--heart-linear]')
const playlistShow = ref(false)
const showLyric = ref(false)
const showHitsInfo = ref(false)

function playing(){
  if(audioRef.value){
    curTime.value = secToHMS(audioRef.value.currentTime)
    let offsetLeft = playInfo.playPortion * (progressWrap.value?.offsetWidth || 0)
    if(progress.value) progress.value.style.width = offsetLeft + 'px'
    if(progress_s.value) progress_s.value.style.width = (playInfo.playPortion * 100) + '%'
  }
}
function onTimeUpdate(){
  handleTimeUpdate(playing)
}
function handleHitsInfo() {
  if (showHitsInfo.value) showHitsInfo.value = false
  else {
    if (track.id) loadHitsInfo(track.id)
    else loadHitsInfo(storeMusic.curPlaylist[storeMusic.curPlayIndex].id)
    showHitsInfo.value = true
  }
}
function hidePlaylist(){
  playlistShow.value = false
}
const { handleCurPlaylistOperation } = useTrackOperations()

const favoritedArtistIcon = computed(() => {
  if(!track.artists || artistsFavStatus.value == 'pending') return 'icon-[solar--user-block-linear]'
  else if(artistsFavStatus.value == 'hasFav') return 'icon-[solar--user-heart-bold]'
  else if(artistsFavStatus.value == 'noneFav') return 'icon-[solar--user-heart-linear]'
  else return 'icon-[solar--user-cross-outline]'
})

watch(track, () => {
  setTimeout(() => {
    refresh()
    fetchArtistsFavStatus()
  }, 300)
})

</script>

<template>
  <div v-show="storeMusic.playerBoxShow">
    <div v-show="showSimple" class=" fixed bottom-6 left-2 w-[calc(100%-(--spacing(4)))] h-12 z-50 bg-white dark:bg-teal-800 rounded-3xl shadow-lg">
      <div class="flex">
        <div class=" flex-none w-12 h-12">
          <img :src="track.cover" crossorigin="anonymous" v-default-src="trackCover" class="w-full h-full rounded-3xl" />
        </div>
        <div class=" flex-1 ml-2 w-0" @click="showSimple = false">
          <div class=" w-full">
            <div class=" truncate">{{ track.title }}</div>
            <div class=" text-gray-400 text-sm truncate">{{ artists }}</div>
          </div>
        </div>
        <div class=" flex-none mr-4">
          <span class=" inline-block h-12 align-middle ml-4 text-2xl" :class="playIcon_s" @click="playAudio"></span>
          <span class=" inline-block icon-[solar--skip-next-bold] h-12 align-middle ml-4 text-2xl" @click="playNext"></span>
        </div>
      </div>
      <div class=" w-[calc(100%-(--spacing(12)))] mx-auto -mt-[2px] h-[2px]">
        <div class=" w-0 h-[2px] bg-cyan-500" ref="progress_s"></div>
      </div>
    </div>
    <transition
      enter-from-class=" translate-y-full"
      leave-to-class="translate-y-full"
      enter-active-class="transition-all duration-300 ease-in-out"
      leave-active-class="transition-all duration-300 ease-in-out"
    >
      <div v-show="!showSimple" class=" fixed bottom-0 left-0 w-full h-svh z-50 p-2" :style="bgColor">
        <div class=" flex  text-stone-50">
          <div class=" flex-none" @click="showSimple = true"><span class="icon-[solar--alt-arrow-down-linear] text-2xl"></span></div>
          <div class=" flex-1 text-center text-lg">
            <span @click="showLyric = false">{{ t('player.track') }}</span> | <span @click="showLyric = true">{{ t('player.lyric') }}</span>
          </div>
          <div class=" flex-none text-lg mr-2">
            <span class="icon-[solar--info-circle-bold]" @click="handleHitsInfo"></span>
          </div>
        </div>
        <div v-show="!showLyric" class=" flex justify-center items-center w-full aspect-square overflow-hidden text-center align-middle">
          <img :src="track.cover" class=" w-2/3 aspect-square object-cover rounded-md" ref="coverImg" />
        </div>
        <div v-show="showLyric" class=" flex justify-center items-center w-full aspect-square text-center relative">
          <div class=" absolute top-0 left-0 w-full aspect-square bg-white opacity-30 blur-xl z-65"></div> 
          <div v-if="lyricInfo.lyricLoading">{{ t('player.lyric_loading') }}</div>
          <div v-else-if="lyricInfo.lyricError">{{ t('player.lyric_error') }}</div>
          <div v-else ref="lyricContainer" class=" w-full aspect-square overflow-y-scroll z-70">
            <p 
              v-for="(line, index) in lyrics" 
              :key="index"
              :ref="el => setLyricLineRef(el as HTMLElement | null, index)"
              class=" text-sm leading-5 my-1 text-shadow-md"
              :class="{' text-amber-400 font-semibold': index == lyricInfo.curLyricIndex}">{{line.text}}</p>
          </div>
        </div>
        <div v-show="showHitsInfo" class=" absolute top-0 left-0 w-full h-full z-55" :style="bgColor" @click="showHitsInfo = false">
          <div class=" opacity-75 rounded-md w-full">
            <img src="/imgs/summer.jpg" class=" object-cover">
          </div>
          <div class=" mt-4 mx-2 p-2 rounded-md bg-gray-200/30 text-stone-600 whitespace-pre-line">{{ parseHits(hitsInfo) }}</div>
        </div>
        <div class=" w-full flex justify-between items-center p-2 text-stone-50">
          <div class=" flex-1 min-w-0">
            <div class=" text-lg truncate">{{ track.title }}</div>
            <div class=" text-gray-200 text-sm truncate">{{ artists }}</div>
          </div>
          <div class=" flex-none flex ml-2">
            <div :class="favoritedTrackIcon" class=" align-middle text-xl" @click="handleFav"></div>
            <div class=" relative ml-4 align-middle text-xl z-50">
              <div :class="favoritedArtistIcon" @click="handleArtistFavs"></div>
              <div class=" absolute top-6 right-0 w-32 max-h-48 p-1 z-55 bg-white rounded-md shadow overflow-y-auto" v-show="artistsFavsShow">
                <div v-for="(artist, index) in artistsFavs" :key="index" 
                  class=" truncate border-b border-b-gray-200 last:border-b-0 m-1 p-1 text-base text-gray-600"
                  :class="{'bg-cyan-100': artist.favorited_at}"
                  @click="handleArtistFavSelected(artist.id)"
                >{{artist.name}}</div>
              </div>
            </div>
            <div class=" ml-4 icon-[solar--add-circle-linear] align-middle text-xl" @click="handleCurPlaylistOperation(track.id, track.title)"></div>
          </div>
        </div>
        <div class=" px-2 mt-4">
          <div class=" w-full h-5 pt-2">
            <div class=" relative w-full h-1 bg-stone-500" ref="progressWrap">
              <div class=" absolute left-0 w-0 h-1 z-100 bg-stone-50" ref="progress"></div>
            </div>
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
          <span class=" icon-[solar--plaaylist-minimalistic-linear] text-2xl text-stone-50" @click="playlistShow = !playlistShow"></span>
        </div>
      </div>
    </transition>
    <transition
      enter-from-class=" translate-y-full"
      leave-to-class="translate-y-full"
      enter-active-class="transition-all duration-300 ease-in-out"
      leave-active-class="transition-all duration-300 ease-in-out"
    >
      <div class=" fixed bottom-0 w-full max-h-72 z-60" v-show="playlistShow">
        <div class=" mx-2 p-2 min-h-96 bg-light dark:bg-dark rounded-lg">
          <div class=" flex justify-between items-center border-b-[1px] border-b-gray-300 py-2">
            <div>{{ t('player.current_playlist') }}</div>
            <div class=" text-cyan-500" @click="playlistShow = false">{{ t('common.close') }}</div>
          </div>
          
          <div class=" max-h-60 overflow-y-auto">
            <div v-for="(trk, idx) in audioList" :key="idx" class=" flex justify-between items-center align-middle py-1">
              <div class=" flex-none w-10 text-center">{{ idx + 1 }}</div>
              <div class=" flex-1 min-w-0 content-center hover:cursor-pointer truncate" @click="playlistItemClick(idx,hidePlaylist)">
                <span v-if="trk.id == storeMusic.curPlaylist[storeMusic.curPlayIndex].id" 
                  class=" icon-[svg-spinners--bars-scale-middle] mr-1 text-cyan-500 align-middle"></span>{{ trk.title }}
              </div>
              <span class=" inline-block h-8 flex-none text-xl icon-[solar--trash-bin-trash-linear] hover:cursor-pointer"
                @click="playRemove(trk.id)"></span>
              <span class=" inline-block h-8 flex-none text-xl ml-2 icon-[solar--menu-dots-bold] hover:cursor-pointer" 
                @click="handleCurPlaylistOperation(trk.id, trk.title)"></span>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
  <audio ref="audioRef" v-bind="$attrs" @timeupdate="onTimeUpdate" @ended="playEnded"></audio>
</template>