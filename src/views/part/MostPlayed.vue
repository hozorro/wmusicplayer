<script setup lang="ts">
import TrackItem from '@/components/TrackItem.vue';
import { useRequest } from 'alova/client';
import useTrackOperations from '@/composables/track-operations';
import { getMostPlayedTracks } from '@/apis/methods/music';

const { loading, data: trackList, error } = useRequest(getMostPlayedTracks);
const { handleClick, handleOperation } = useTrackOperations()
</script>

<template>
  <div v-bind="$attrs">
    <div class=" flex flex-nowrap mt-2 overflow-x-scroll snap-x snap-mandatory">
      <div v-if="loading" class=" text-center"><span class="icon-[svg-spinners--gooey-balls-1] text-2xl"></span></div>
      <div v-else-if="error">{{ error.message }}</div>
      <div v-else class=" flex-none w-full snap-start snap-always mr-2" v-for="i in Math.ceil(trackList.length / 4)">
        <div v-for="j in 4">
          <TrackItem v-if="(i-1)*4+j <= trackList.length"
            :id="trackList[(i-1)*4+j-1].id"
            :title="trackList[(i-1)*4+j-1].title"
            :art="trackList[(i-1)*4+j-1].cover"
            :show-art="true"
            :sub-info="trackList[(i-1)*4+j-1].artists"
            @item-click="handleClick"
            @operation="handleOperation"
            class=" my-2"
          />
        </div>
      </div>
    </div>
  </div>
</template>