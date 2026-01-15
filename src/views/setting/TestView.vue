<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { generalAlova } from '@/apis';
import { invalidateCache } from 'alova';
import { useMusicStore } from '@/store/music';
import * as musicMethods from '@/apis/methods/music';
import { useI18n } from 'vue-i18n';

const { idbHelper } = useMusicStore();
const { t } = useI18n();

const methods = ref<[string,string][]>([])
const selectedMethods = ref<string[]>([])
const excludeMethods = ['login', 'refreshToken', 'getCurrentUser']

for (const key in musicMethods) {
  const method = (musicMethods as any)[key]
  if (typeof method === 'function' && !excludeMethods.includes(method.name)) {
    methods.value.push([method.name, method.name])
  }
}
function handleInvalidateCaches() {
  //TODO: 批量删除缓存
  if(selectedMethods.value.length){
    for(const m of selectedMethods.value) {
      const matchedMethods = generalAlova.snapshots.match(m)
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
test2.value = 'delete playlist'
async function testFunc2() {
  // TODO
  idbHelper.delete('playlist', model2.value)
  invalidateCache([musicMethods.getPlaylists(), musicMethods.getTopPlaylists()])
  console.log('deleted playlist ', model2.value)
}

onMounted(() => {
  const st = localStorage.getItem('music')
  let music: any = {}
  if(st) music = JSON.parse(st)
  console.log(music.isDark)
})



</script>

<template>
  <div class=" p-2">
    <div class=" flex justify-between">
      <router-link to="/setting" class=" flex-none text-lg font-semibold"><span class=" icon-[solar--alt-arrow-left-linear] align-middle text-gray-600"></span></router-link>
      <div class=" flex-1 text-lg font-semibold text-right">{{ t('settings.test') }}</div>
    </div>
    <div class=" mt-2 p-2">
      <button class=" px-2 block h-8 bg-cyan-600 text-white rounded-md" @click="handleInvalidateCaches">InvalidateCache</button>
      <div>
        <select v-model="selectedMethods" multiple class=" w-full text-sm p-2 mt-2 border-1 focus:outline-0 rounded-md" @change="console.log(selectedMethods)">
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
      
    </div>
  </div>
</template>

