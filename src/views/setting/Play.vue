<script setup lang="ts">
import { computed } from 'vue';
import { useMusicStore } from '@/store/music';

const store = useMusicStore();
const playRatio = computed({
  get() { return store.getParam('stat_percent') },
  set(val) { store.setParam('stat_percent', val) }
})
const switchTime = computed({
  get() { return store.getParam('switch_time') },
  set(val) { store.setParam('switch_time', val) }
})
const retryTimes = computed({
  get() { return store.getParam('max_fail_count') },
  set(val) { store.setParam('max_fail_count', val) }
})
const isLoop = computed({
  get() { return store.getParam('isLoop') },
  set(val) { store.setParam('isLoop', val) }
})
const isAutoNext = computed({
  get() { return store.getParam('isAutoPlayNext') },
  set(val) { store.setParam('isAutoPlayNext', val) }
})
const refreshTime = computed({
  get() { return store.getParam('timeUpdateInterval') },
  set(val) { store.setParam('timeUpdateInterval', val) }
})
const syncBatchSize = computed({
  get() { return store.getParam('transferBatchSize') },
  set(val) { store.setParam('transferBatchSize', val) }
})
</script>

<template>
  <div class=" p-2">
    <div class=" flex justify-between">
      <router-link to="/setting" class=" flex-none text-lg font-semibold"><span class=" icon-[solar--alt-arrow-left-linear] align-middle text-gray-600"></span></router-link>
      <div class=" flex-1 text-lg font-semibold text-right">播放设置</div>
    </div>
    <div class=" mt-2 p-2">
      <div class=" flex justify-between items-center w-full py-2 border-b border-gray-200">
        <div class=" flex-1 mr-2">
          <div>播放计数比例<span class=" text-sm text-amber-500"> ({{ playRatio }}%)</span></div>
          <div class=" text-xs text-gray-400">当播放时长超过此比例时，才算有效播放。</div>
        </div>
        <div class=" flex-none">
          <input type="range" min="10" max="100" step="10" v-model="playRatio" class=" w-32">
        </div>
      </div>
      <div class=" flex justify-between items-center w-full py-2 border-b border-gray-200">
        <div class=" flex-1 mr-2">
          <div>切换歌曲延时<span class=" text-sm text-amber-500"> ({{ switchTime }} ms)</span></div>
          <div class=" text-xs text-gray-400">一曲播完后播放下一首时延时的时间，毫秒。</div>
        </div>
        <div class=" flex-none">
          <input type="range" min="100" max="900" step="100" v-model="switchTime" class=" w-32">
        </div>
      </div>
      <div class=" flex justify-between items-center w-full py-2 border-b border-gray-200">
        <div class=" flex-1 mr-2">
          <div>失败重试次数<span class=" text-sm text-amber-500"> ({{ retryTimes }} 次)</span></div>
          <div class=" text-xs text-gray-400">播放歌曲失败时自动尝试切换下一首的次数。</div>
        </div>
        <div class=" flex-none">
          <input type="range" min="1" max="10" step="1" v-model="retryTimes" class=" w-32">
        </div>
      </div>
      <div class=" flex justify-between items-center w-full py-2 border-b border-gray-200">
        <div class=" flex-1 mr-2">
          <div>自动从头循环<span class=" text-sm text-amber-500"> ({{ isLoop ? '是' : '否' }})</span></div>
          <div class=" text-xs text-gray-400">最后一首播放完毕后是否自动从头播放第一首。</div>
        </div>
        <div class=" flex-none justify-items-end">
          <input type="checkbox" v-model="isLoop" class=" w-12">
        </div>
      </div>
      <div class=" flex justify-between items-center w-full py-2 border-b border-gray-200">
        <div class=" flex-1 mr-2">
          <div>自动下一首<span class=" text-sm text-amber-500"> ({{ isAutoNext ? '是' : '否' }})</span></div>
          <div class=" text-xs text-gray-400">是否自动播放第一首。</div>
        </div>
        <div class=" flex-none justify-items-end">
          <input type="checkbox" v-model="isAutoNext" class=" w-12">
        </div>
      </div>
      <div class=" flex justify-between items-center w-full py-2 border-b border-gray-200">
        <div class=" flex-1 mr-2">
          <div>播放进度刷新周期<span class=" text-sm text-amber-500"> ({{ refreshTime }} ms)</span></div>
          <div class=" text-xs text-gray-400">每隔多长时间刷新一次播放进度，毫秒。</div>
        </div>
        <div class=" flex-none">
          <input type="range" min="100" max="900" step="100" v-model="refreshTime" class=" w-32">
        </div>
      </div>
      <div class=" flex justify-between items-center w-full py-2">
        <div class=" flex-1 mr-2">
          <div>同步数据批次大小<span class=" text-sm text-amber-500"> ({{ syncBatchSize }} 条/次)</span></div>
          <div class=" text-xs text-gray-400">同步数据库时，会分批次请求，在此设定每批次请求记录条数。</div>
        </div>
        <div class=" flex-none">
          <input type="range" min="100" max="900" step="100" v-model="syncBatchSize" class=" w-32">
        </div>
      </div>
    </div>
  </div>
  
</template>