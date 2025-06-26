<script setup lang="ts">
import { ref } from 'vue';
import useCreateNode from '@/composables/element';

interface Message { 
  message: string,
  mtype: MsgType,
}

const {message='', mtype='info'} = defineProps<Message>()
useCreateNode('message')
const isVisible = ref(true)

const iconStyle = {
  info: 'icon-[solar--info-circle-bold]',
  success: 'icon-[solar--check-circle-bold]',
  warning: 'icon-[solar--danger-circle-bold]',
  error: 'icon-[solar--close-circle-bold]'
}
const bgStyle = {
  info: 'bg-stone-300/50, text-stone-500',
  success: 'bg-green-300/50, text-green-500',
  warning: 'bg-yellow-300/50 text-yellow-500',
  error: 'bg-red-300/50 text-red-500'
}
</script>

<template>
  <Teleport to="#message">
    <div v-if="isVisible" 
      class=" fixed top-1/2 left-1/2 -translate-x-1/2 -tranlate-y-1/2 max-w-44 max-h-44 p-2 flex justify-between items-center rounded-lg" 
      :class="bgStyle[mtype]">
      <div class=" flex-none">
        <span class=" text-2xl mr-2" :class="iconStyle[mtype]"></span>
      </div>
      <div class=" flex-1 w-full">{{ message }}</div>
    </div>
  </Teleport>
</template>