<script setup lang="ts">
import { ref, useTemplateRef, onMounted } from 'vue'
import { generalAlova } from '@/apis';
import { invalidateCache } from 'alova';
import { useMusicStore } from '@/store/music';
import { testTrack } from '@/apis/methods/music';
import { parseHits } from '@/utilies/time-text';

const { idbHelper } = useMusicStore();

const methods = ref<[string,string][]>([])

function handleInvalidateCaches() {
  //TODO: 批量删除缓存
  if(methods.value.length){
    for(const m of methods.value) {
      const matchedMethods = generalAlova.snapshots.match(m[0])
      invalidateCache(matchedMethods)
    }
  }
}

const model1 = ref('')
const model2 = ref('')
const test1 = ref('')
const test2 = ref('')


test1.value = 'update model'
async function testFunc1() {
  // TODO
  // const count = await idbHelper.getCount('album')
  await idbHelper.update('meta', 'trackhit', {name: 'trackhit', last_update: '2000-01-01T00:00:00.000Z'})
  alert('更新成功')
}
test2.value = 'timeText'
async function testFunc2() {
  // TODO
  const timeList = await testTrack()
  console.log(parseHits(timeList))
}

const needShowMore = ref(false)
const showMore = ref(false)
const artists = 'Celine Dion, Taylor Swift, Michael Jackson'
const iconDiv = useTemplateRef<HTMLElement>('iconDiv')
const abArDiv = useTemplateRef<HTMLElement>('abArDiv')
onMounted(() => {
  if(iconDiv.value && abArDiv.value) {
    const height = iconDiv.value?.getBoundingClientRect().height
    const abArHeight = abArDiv.value?.getBoundingClientRect().height
    console.log(height, abArHeight)
    if(abArHeight > height) {
      needShowMore.value = true
    }
  }
})



</script>

<template>
  <div class=" p-2">
    <div class=" flex justify-between">
      <router-link to="/setting" class=" flex-none text-lg font-semibold"><span class=" icon-[solar--alt-arrow-left-linear] align-middle text-gray-600"></span></router-link>
      <div class=" flex-1 text-lg font-semibold text-right">试验功能</div>
    </div>
    <div class=" mt-2 p-2">
      <button class=" px-2 block h-8 bg-cyan-600 text-white rounded-md" @click="handleInvalidateCaches">InvalidateCache</button>
      <div>
        <select v-model="methods" multiple class=" w-full text-sm p-2 mt-2 border-1 focus:outline-0 rounded-md">
          <option v-for="method in methods" :key="method[0]" :value="method[0]">{{method[1]}}</option>
        </select>
    </div>
    </div>
    <div class=" mt-2 p-2">
      <button class=" px-2 block h-8 bg-cyan-600 text-white rounded-md" @click="testFunc1">测试（{{ test1 }}）</button>
      <div><input type="text" v-model="model1" class=" w-full text-sm h-8 p-2 mt-2 border-1 focus:outline-0 rounded-md" /></div>
    </div>
    <div class=" mt-2 p-2"> 
      <!-- {{ track ?`${track.id}, ${track.title}, ${track.genre_ids}` : '' }} -->
    </div>
    <div class=" mt-2 p-2">
      <button class=" px-2 block h-8 bg-cyan-600 text-white rounded-md" @click="testFunc2">测试（{{ test2 }}）</button>
      <div><input type="text" v-model="model2" class=" w-full text-sm h-8 p-2 mt-2 border-1 focus:outline-0 rounded-md" /></div>
    </div>
    <div class=" mt-2 p-2">
      <!-- <div>Total: {{total}}</div>
      <div v-for="track in tracks" :key="track.id">{{track.title}}</div> -->
    </div>
    <div class=" flex w-full mt-2 p-2 items-start">
      <div class=" p-1" ref="iconDiv"><span class=" text-lg align-middle icon-[solar--user-speak-linear]"></span></div>
      <div class=" flex-1 flex relative min-w-0">
        <div class=" flex-1 min-w-0 p-1 truncate">{{ artists }}</div>
        <div class=" flex-none text-cyan-500 py-1" v-if="needShowMore" v-show="!showMore" @click="showMore = true">更多</div>
        <div class=" absolute top-0 left-0 right-0 p-1 rounded-md text-wrap bg-cyan-50" 
          ref="abArDiv" 
          :class="{'visible': showMore, 'invisible': !showMore}">
          {{ artists }} <span @click="showMore = false" class=" ml-2 text-cyan-500">更少</span>
        </div>
      </div>
    </div>
  </div>
</template>

