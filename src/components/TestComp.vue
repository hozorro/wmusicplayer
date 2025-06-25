<script setup lang="ts">
const isShow = defineModel<boolean>('isShow', {default:false})
</script>

<template>
  <div v-show="isShow" class="absolute w-full h-full z-50"> Pop Menu</div>
</template>