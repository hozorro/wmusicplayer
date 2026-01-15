<script setup lang="ts">
import { ref, onMounted, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'

const {initKw} = defineProps<{initKw?:string}>()

const router = useRouter()
const keyword = ref('')
const searchInput = useTemplateRef('searchInput')

onMounted(() => { 
  if (initKw) keyword.value = initKw
})
const search = () => { 
  if (!keyword.value) return
  router.push({name:'search',query:{kw:keyword.value}})
}
function clear() {
  keyword.value = ''
  searchInput.value?.focus()
}
</script>

<template>
  <div class=" flex p-2">
    <RouterLink to="/" class=" flex-none">
      <span class=" icon-[solar--home-2-linear] text-2xl h-8 leading-8"></span>
    </RouterLink>
    <div class=" flex-1 ml-2 relative">
      <div class=" absolute top-0 left-1">
        <span class=" icon-[solar--magnifer-linear] text-lg h-8 leading-8"></span>
      </div>
      <input type="text" 
        ref="searchInput"
        v-model="keyword" 
        class=" w-full h-8 py-2 px-7 bg-gray-200 dark:bg-teal-800/50 rounded-md focus:outline-0" 
        placeholder="search"
        @keyup.enter="search"
        @keyup.esc="clear" />
      <div class=" absolute top-0 right-1" v-show="keyword" @click="clear">
        <span class=" icon-[solar--close-circle-outline] text-lg text-gray-400 dark:text-gray-300 h-8 leading-8"></span>
      </div>
    </div>
    <div class=" flex-none ml-2">
      <router-link to="/setting">
        <span class=" icon-[solar--settings-linear] text-2xl h-8 leading-8"></span>
      </router-link>
    </div>
  </div>
</template>