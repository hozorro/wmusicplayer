<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { getTrackMoreInfo } from '@/apis/methods/music';
const props = defineProps<{
  trackId: number;
}>();
const moreInfo = ref<TrackMoreInfo | null>(null);
const bitrate = computed(() => {
  if (!moreInfo.value) return '';
  return `${moreInfo.value.bitrate}${moreInfo.value.bitrate_mode}`;
});
onMounted(async () => { 
  moreInfo.value = await getTrackMoreInfo(props.trackId);
});
</script>

<template>
  <div class=" grid grid-cols-[100px_1fr] gap-2 text-sm text-gray-500">
    <div>year：</div>
    <div>{{ moreInfo?.year || 'Unknown' }}</div>
    <div>bitrate：</div>
    <div>{{ bitrate }}</div>
    <div>acoustid：</div>
    <div>{{ moreInfo?.acoustid_id || 'Unknown' }}</div>
    <div>mb_trackid：</div>
    <div>{{ moreInfo?.mb_trackid || 'Unknown' }}</div>
    <div>path：</div>
    <div>{{ moreInfo?.path || 'Unknown' }}</div>
  </div>
</template>