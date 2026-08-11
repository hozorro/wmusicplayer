<script setup lang="ts">
import TrackRow from '@/components/TrackRow.vue';

const {trackList = []} = defineProps<{trackList: Track[]}>()
</script>

<template>
  <div class=" flex flex-nowrap mt-2 overflow-x-scroll snap-x snap-mandatory">
    <div class=" flex-none w-full snap-start snap-always mr-2" v-for="i in Math.ceil(trackList.length / 4)">
      <div v-for="j in 4">
        <TrackRow v-if="(i-1)*4+j <= trackList.length"
          :track="trackList[(i-1)*4+j-1]"
          :show-art="true"
          class=" my-2"
        />
      </div>
    </div>
  </div>
</template>