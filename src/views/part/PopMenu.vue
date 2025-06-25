<script setup lang="ts">
interface OperationMenu {
  title: string;
  operations: Operation[];
}
const {title = '', operations = []} = defineProps<OperationMenu>();
const ppmVisible = defineModel<boolean>('ppmVisible',{default:false})
</script>

<template>
<teleport to="body">
  <div class=" fixed inset-0 bg-gray-800 opacity-50 z-60" v-show="ppmVisible" @click="ppmVisible = false"></div>
  <transition
    enter-from-class=" translate-y-full"
    leave-to-class="translate-y-full"
    enter-active-class="transition-all duration-300 ease-in-out"
    leave-active-class="transition-all duration-300 ease-in-out"
  >
    <div class=" fixed w-full bottom-0 z-70" v-bind="$attrs" v-show="ppmVisible">
      <div class=" mx-1 p-2 bg-white rounded-t-lg">
        <div class=" flex w-full py-2 justify-between border-b-[1px] border-b-stone-200">
          <div>{{ title }}</div>
          <div class=" cursor-pointer" @click="ppmVisible = false">取消</div>
        </div>
        <ul class=" ml-4 mt-2">
          <li v-for="(opr, index) in operations" :key="index" class=" border-b-stone-200 lask:border-b-0">
            <div class=" py-2 cursor-pointer" @click="opr.action">{{ opr.label }}</div>
          </li>
        </ul>
      </div>
    </div>
  </transition>
</teleport>
</template>