<script setup lang="ts">
interface OperationMenu {
  title: string;
  popType: PopType;
  operations: Operation[];
}
const {title = '', operations = []} = defineProps<OperationMenu>();
const ppmVisible = defineModel<boolean>('ppmVisible',{default:false})
const typeMap: Record<PopType, string> = {
  'track': '歌曲',
  'album': '专辑',
  'artist': '歌手',
  'playlist': '歌单',
  'genre': '分类',
  'folder': '文件夹',
}
</script>

<template>
<teleport to="body">
  <div class=" fixed inset-0 bg-gray-800 opacity-50 z-60" v-show="ppmVisible" @click="ppmVisible = false"></div>
  <transition
    enter-from-class=" translate-y-full"
    leave-to-class="translate-y-full"
    enter-active-class="transition-transform duration-300 ease-in-out"
    leave-active-class="transition-transform duration-300 ease-in-out"
  >
    <div class=" fixed w-full bottom-0 z-70" v-bind="$attrs" v-show="ppmVisible">
      <div class=" mx-1 p-2 bg-white rounded-t-lg">
        <div class=" flex w-full py-2 justify-between border-b-[1px] border-b-stone-200">
          <div class=" flex-1 w-56 truncate"><span>{{ typeMap[popType] }}</span>: {{ title }}</div>
          <div class=" flex-none text-cyan-500 cursor-pointer" @click="ppmVisible = false">取消</div>
        </div>
        <ul class=" mx-3 mt-2">
          <li v-for="(opr, index) in operations" :key="index" class=" border-b border-b-stone-100 last:border-b-0">
            <div class=" py-2 cursor-pointer" @click="opr.action">
              <span :class="opr.icon" class=" text-lg align-middle mr-2"></span>
              <span>{{ opr.label }}</span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </transition>
</teleport>
</template>