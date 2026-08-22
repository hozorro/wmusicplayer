<script setup lang="ts">
/**
 * P3 真机验收台 / PlayerBox 胚体
 * - 只消费 usePlayer / usePlayQueue —— 与未来 PlayerBox、各页面完全相同的 API 面
 * - 事件日志经公开总线观察（外围消费者的标准姿势）
 */
import { computed, ref } from 'vue'
import { usePlayer } from '@/composables/playback';
import { usePlayerQueue } from '@/composables/player-queue';
import { getPlayerFacade } from '@/player/facade';
import { PlayerEvent } from '@/player/events';
import type { PlayTrack } from '@/player/types';
import { getRandomTracks } from '@/apis/methods/music';
import { toPlayTrack } from '@/services/transform';

const player = usePlayer();
const queue = usePlayerQueue();
const tracks = ref<Track[]>([])

const isLoading = computed(() => player.isBuffering || player.isPlaying || tracks.value.length > 0)

// —— 事件日志：验证投影链 ——
const logs = ref<string[]>([])
const push = (line: string) => logs.value.unshift(`${new Date().toLocaleTimeString()} ${line}`)

const facade = getPlayerFacade();
facade.bus.on(PlayerEvent.TrackChanged, (track: PlayTrack) => push(`TrackChanged ${track.title}`))
facade.bus.on(PlayerEvent.StateChanged, (state: string) => push(`StateChanged ${state}`))
facade.bus.on(PlayerEvent.QueueChanged, (k) => push(`QueueChanged ${k}`))
facade.bus.on(PlayerEvent.PlaybackError, (error) => push(`PlaybackError ${error.action}`))

const MODE_LABEL = {
  sequential: '顺序播放',
  'loop-all': '循环播放',
  'loop-one': '单曲循环',
  shuffle: '随机播放',
} as const
const NEXT_MODE = {
  sequential: 'loop-all',
  'loop-all': 'loop-one',
  'loop-one': 'shuffle',
  shuffle: 'sequential',
} as const
const cycleMode = () => queue.setMode(NEXT_MODE[queue.mode.value])

async function startTest() {
  push('fetching random tracks...')
  try {
    tracks.value = await getRandomTracks(3).send()
    push(`got ${tracks.value.length} tracks: ${tracks.value.map(t => t.title).join(', ')}`)
    player.playAll(tracks.value.map(t => toPlayTrack(t)))
  } catch (e: any) {
    push(`init error: ${e.message}`)
  }
}

</script>

<template>
  <main class=" max-w-120 mx-auto p-6">
    <header class=" flex items-center gap-3">
      <strong>{{ player.currentTrack.value?.title || '未在播放' }}</strong>
      <span class=" text-xs px-2 py-0.5 border border-cyan-500 rounded-4xl">
        {{ player.isBuffering.value ? '缓冲中' : player.isPlaying.value ? '播放中' : player.engineState.value }}
      </span>
      <span class=" text-xs cursor-pointer opacity-70" @click="cycleMode">{{ MODE_LABEL[queue.mode.value] }}</span>
    </header>
    <button
        class=" w-full my-4 h-9 bg-cyan-600 text-white rounded-md text-sm disabled:opacity-50 mb-4"
        :disabled="isLoading.value"
        @click="startTest"
      >
      载入测试队列并播放
    </button>

    <section class=" flex justify-center gap-6 text-xl">
      <button @click="player.prev()">⏮</button>
      <button class=" text-3xl"@click="player.toggle()">{{ player.isPlaying.value ? '⏸' : '▶' }}</button>
      <button @click="player.next()">⏭</button>
    </section>

    <input 
      type="range" class=" w-full my-4"
      :max="player.duration.value || 0"
      :value="player.time.value"
      @change="e => player.seek(Number((e.target as HTMLInputElement).value))"
    />

    <!-- Event Log -->
    <div class="border rounded-md p-2">
      <div class="text-xs font-semibold text-gray-400 mb-1">事件日志</div>
      <div class="max-h-64 overflow-y-auto text-xs font-mono space-y-0.5">
        <div v-for="(log, i) in logs" :key="i" class="text-gray-700">{{ log }}</div>
        <div v-if="logs.length === 0" class="text-gray-400">等待操作...</div>
      </div>
    </div>
  </main>
</template>