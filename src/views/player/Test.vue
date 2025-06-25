<script setup lang="ts">
import { ref, computed } from "vue";
import useColor from "@/utilies/img-color";

const { convertDarkColor } = useColor()
const color = ref("#FFFFFF");
const rgb = computed(() => {
  const matchResult = color.value.match(/[0-9A-F]{2}/gi);
  if (matchResult){
    return matchResult.map(item => parseInt(item, 16)) as [number,number,number];
  } else { 
    return [255,255,255] as [number,number,number];
  }
});
const darkColor = computed(() => {
  return convertDarkColor(rgb.value)
});
let extendList = Array.from(
  {length: 16-12},
  (v, i) => 12 + i
)
console.log(extendList)
</script>

<template>
  <div class=" w-4/5 grid gap-2 grid-cols-8 mx-auto my-4">
    <div v-for="i in 16" class=" rounded-md aspect-[3/1]" :style="`background-color: rgba(${i*8},0,0);`"></div>
  </div>
  <div class=" flex w-4/5 ml-16">
    <div class=" flex-none">
      <div>HEX: <input type="text" v-model="color" class=" w-24 h-6 p-2 my-4 border-2 focus:outline-0 rounded-md" placeholder="#FFFFFF" /></div>
      <div>R: <input type="text" v-model="rgb[0]" class=" w-24 h-6 p-2 mt-6 border-2 focus:outline-0 rounded-md" placeholder="Red" /></div>
      <div>G: <input type="text" v-model="rgb[1]" class=" w-24 h-6 p-2 mt-2 border-2 focus:outline-0 rounded-md" placeholder="Green" /></div>
      <div>B: <input type="text" v-model="rgb[2]" class=" w-24 h-6 p-2 mt-2 border-2 focus:outline-0 rounded-md" placeholder="Blue" /></div>
    </div>
    <div class=" flex-1 ml-4"> 
      <div class=" inline-block align-top w-44 h-44 rounded-md" :style="`background-color: ${color}`"></div>
      <div class=" inline-block align-top ml-4 p-4 w-44 h-44 rounded-md" :style="`background-color: ${darkColor}`">
        <div class=" text-lg text-stone-50">雕刻时光</div>
        <div class=" mt-2 text-sm text-stone-200">唯有音乐可以雕刻时光</div>
      </div>
    </div>
  </div>
</template>