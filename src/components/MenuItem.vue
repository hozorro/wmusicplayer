<script setup lang="ts">
interface MenuItemProps {
  title: string;
  icon: string;
  toUrl: string;
}
const { title, icon, toUrl } = defineProps<MenuItemProps>()
</script>

<template>
  <div class=" flex justify-between w-full py-2">
    <router-link :to="toUrl">
      <span class=" text-xl align-middle mr-2" :class="icon"></span>
      <span>{{ title }}</span>
    </router-link>
    <div>
      <span class=" text-xl align-middle icon-[solar--alt-arrow-right-linear]"></span>
    </div>
  </div>
</template>