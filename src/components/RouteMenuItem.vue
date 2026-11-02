<script setup lang="ts">
interface MenuItemProps {
  title: string;
  icon: string;
  toUrl: string;
}
const { title, icon, toUrl } = defineProps<MenuItemProps>()
</script>

<template>
  <div class=" flex justify-between items-center w-full py-2">
    <router-link :to="toUrl" class=" flex-1">
      <span class=" text-xl align-middle mr-2" :class="icon"></span>
      <span>{{ title }}</span>
    </router-link>
    <div class=" flex-none">
      <span class=" text-xl align-middle icon-[solar--alt-arrow-right-linear]"></span>
    </div>
  </div>
</template>