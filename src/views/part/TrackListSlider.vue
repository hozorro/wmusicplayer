<script setup lang="ts">
import TrackItem from '@/components/TrackItem.vue';
import useTrackOperations from '@/composables/track-operations';

const {trackList = []} = defineProps<{trackList: Track[]}>()
const { handleClick, handleOperation } = useTrackOperations()
</script>

<template>
  <div class=" flex flex-nowrap mt-2 overflow-x-scroll snap-x snap-mandatory">
    <div class=" flex-none w-full snap-start snap-always mr-2" v-for="i in Math.ceil(trackList.length / 4)">
      <div v-for="j in 4">
        <TrackItem v-if="(i-1)*4+j <= trackList.length"
          :id="trackList[(i-1)*4+j-1].id"
          :title="trackList[(i-1)*4+j-1].title"
          :art="trackList[(i-1)*4+j-1].cover"
          :show-art="true"
          :sub-info="trackList[(i-1)*4+j-1].artists?.join(', ')"
          @item-click="handleClick"
          @operation="handleOperation"
          class=" my-2"
        />
      </div>
    </div>
  </div>
</template>