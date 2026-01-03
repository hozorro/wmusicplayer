<script setup lang="ts">
import { ref } from "vue";
import { 
  getRandomArtistTracks, 
  getRandomConstraintedArtistTracks, 
  getRandomWeightedArtistTracks, 
  getRandomHitsWeightedTracks 
} from "@/apis/methods/music";
import { PlayChangeMode } from "@/constants/play-constants";
import { useMusicStore } from "@/store/music";

const store = useMusicStore();
const trackPerArtist = ref(2);
const weightRateArtist = ref(2);
const weightRateHit = ref(2);

function handleGetRandomArtistTracks() {
  getRandomArtistTracks(50).then(res => {
    console.log(res);
    store.addListToCurPlaylist(res, PlayChangeMode.REPLACE_LIST)
  });
}
function handleGetRandomConstraintedArtistTracks() {
  getRandomConstraintedArtistTracks(50, trackPerArtist.value).then(res => {
    store.addListToCurPlaylist(res, PlayChangeMode.REPLACE_LIST)
  });
}
function handleGetRandomWeightedArtistTracks() {
  getRandomWeightedArtistTracks(50, weightRateArtist.value).then(res => {
    store.addListToCurPlaylist(res, PlayChangeMode.REPLACE_LIST)
  });
}
function handleGetRandomHitWeightedTracks() {
  getRandomHitsWeightedTracks(50, weightRateHit.value).then(res => {
    store.addListToCurPlaylist(res, PlayChangeMode.REPLACE_LIST)
  });
}
</script>

<template>
  <div class=" p-2">
    <div>
      <router-link to="/" class=" flex-none text-lg font-semibold">
        <span class=" icon-[solar--alt-arrow-left-linear] align-middle text-gray-600"></span>
        <span class=" text-lg font-semibold">高级随机播放</span>
      </router-link>
    </div>
    <div class=" mt-4">
      <div class=" flex mt-2 p-2 rounded-md bg-gray-200">
        <div class=" flex-1 text-gray-500 text-sm">随机选出50位歌手，每位歌手随机1首歌。</div>
        <div class=" flex-none button" @click="handleGetRandomArtistTracks">
          <span class="icon-[solar--user-speak-outline] text-4xl block mx-auto" style="color: #f48e00;"></span>
          <span class=" block">歌手随机</span>
        </div>
      </div>
      <div class=" flex mt-2 p-2 rounded-md bg-gray-200">
        <div class=" flex-1">
          <div class=" flex-1 text-gray-500 text-sm">随机从tracks库中选出50首，但每位歌手的歌不超过的歌曲数目：</div>
          <div class=" mt-2 text-center text-amber-500">
            <input type="range" min="2" max="9" v-model="trackPerArtist" class=" w-1/2" /> {{ trackPerArtist }}
          </div>
        </div>
        <div class=" flex-none button" @click="handleGetRandomConstraintedArtistTracks">
          <span class="icon-[solar--magnet-wave-outline] text-4xl block mx-auto" style="color: #f48e00;"></span>
          <span class=" block">约束随机</span>
        </div>
      </div>
      <div class=" flex mt-2 p-2 rounded-md bg-gray-200">
        <div class=" flex-1">
          <div class=" flex-1 text-gray-500 text-sm">加权随机选出50位歌手，每位歌手1首歌。权重度越高，越偏向于歌曲数量多的歌手。权重度：</div>
          <div class=" mt-2 text-center text-amber-500">
            <input type="range" min="2" max="9" v-model="weightRateArtist" class=" w-1/2" /> {{ weightRateArtist }}
          </div>
        </div>
        <div class=" flex-none button" @click="handleGetRandomWeightedArtistTracks">
          <span class="icon-[solar--translation-2-broken] text-4xl block mx-auto" style="color: #f48e00;"></span>
          <span class=" block">加权随机</span>
        </div>
      </div>
      <div class=" flex mt-2 p-2 rounded-md bg-gray-200">
        <div class=" flex-1">
          <div class=" flex-1 text-gray-500 text-sm">加权随机选出50首歌，优先度越高，越偏向于播放过的。优先度：</div>
          <div class=" mt-2 text-center text-amber-500">
            <input type="range" min="2" max="9" v-model="weightRateHit" class=" w-1/2" /> {{ weightRateHit }}
          </div>
        </div>
        <div class=" flex-none button" @click="handleGetRandomHitWeightedTracks">
          <span class="icon-[solar--cup-music-outline] text-4xl block mx-auto" style="color: #f48e00;"></span>
          <span class=" block">熟歌模式</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped> 
@reference "tailwindcss";
.button {
  @apply ml-2 w-24 aspect-square rounded-md border border-cyan-500 bg-cyan-50 text-lg text-gray-600 font-bold text-center content-center;
}
</style>