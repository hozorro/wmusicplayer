<script setup lang="ts">
import { ref } from 'vue'
// import { getLatestTracks } from '@/apis/methods/music';
// import { useRequest } from 'alova/client';
// const { loading, data: trackList, error } = useRequest(getLatestTracks);
const trackList = ref<any[]>([
  { title: 'Song1', artists: ['Artist1', 'Artist2'] },
  { title: 'Song2', artists: ['Artist3', 'Artist4'] },
  { title: 'Song3', artists: ['Artist5', 'Artist6'] },
  { title: 'Song4', artists: ['Artist7', 'Artist8'] },
  { title: 'Song5', artists: ['Artist9', 'Arttist10']}
])
const loading = ref(true)
setTimeout(() => loading.value = false, 1000)
const error = ref<null|{message:'error'}>(null)
</script>

<template>
  <div class=" px-2">
    <div class=" flex justify-between">
      <div class=" text-lg font-semibold">歌单<span class=" icon-[solar--alt-arrow-right-linear] align-middle text-gray-600"></span></div>
      <div class=" flex-none">
        <div class=" inline-block bg-cyan-700 text-white text-sm place-content-center px-2 rounded-md shadow-sm">FAV</div>
        <div class=" inline-block bg-cyan-700 text-white text-sm place-content-center ml-2 px-1 rounded-md shadow-sm">RND50</div>
      </div>
    </div>
    <div class=" mt-2 flex flex-nowrap overflow-x-scroll">
      <template v-for="i in 6">
        <div class=" flex-none w-1/4 aspect-square mr-2 last:mr-0 bg-gray-200 rounded-md">{{ i }}</div>
      </template>
    </div>
    <div class=" mt-3 flex justify-between">
      <div class=" text-lg font-semibold">歌手<span class=" icon-[solar--alt-arrow-right-linear] align-middle text-gray-600"></span></div>
      <div class=" flex-none">
        <div class=" inline-block bg-cyan-700 text-white text-sm place-content-center px-2 rounded-md shadow-sm">FOLDER</div>
      </div>
    </div>
    <div class=" mt-2 flex flex-nowrap overflow-x-scroll">
      <template v-for="i in 10">
        <div class=" flex-none w-1/5 aspect-square mr-2 last:mr-0 bg-gray-200 rounded-md">{{ i }}</div>
      </template>
    </div>
    <div class=" mt-3 text-lg font-semibold">流派<span class=" icon-[solar--alt-arrow-right-linear] align-middle text-gray-600"></span></div>
    <div class=" mt-2 flex flex-wrap gap-2">
      <template v-for="i in 10">
        <div class=" flex-none h-10 leading-10 px-2 bg-gray-200 rounded-md">{{ 'Genre' + i }}</div>
      </template>
    </div>
    <div class=" mt-4 text-lg font-semibold">
      <div class=" inline-block border-b-cyan-600 border-b-2">最近添加</div>
      <div class=" inline-block ml-4">最常播放</div>
      <div class=" inline-block ml-4">常听歌手</div>
    </div>
    <div class=" flex flex-nowrap mt-2 overflow-x-scroll snap-x snap-mandatory">
      <div v-if="loading" class=" text-center"><span class="icon-[svg-spinners--gooey-balls-1] text-2xl"></span></div>
      <div v-else-if="error">{{ error.message }}</div>
      <div v-else class=" flex-none w-full snap-start snap-always mr-2" v-for="i in Math.ceil(trackList.length / 4)">
        <template v-for="j in 4">
          <div class=" flex w-full mb-2 last:mb-0" v-if="(i-1)*4+j <= trackList.length">
            <div class=" flex-none w-12 h-12 bg-gray-200 rounded-md">{{ `cov${(i-1)*4+j}` }}</div>
            <div class=" flex-1 ml-2">
              <div class=" max-w-full overflow-ellipsis">{{ trackList[(i-1)*4+j-1].title }}</div>
              <div class=" text-sm text-gray-400 mt-1 max-w-full overflow-ellipsis">{{ trackList[(i-1)*4+j-1].artists.join(',') }}</div>
            </div>
            <div class=" flex-none w-12 h-12 text-right pr-2">...</div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>