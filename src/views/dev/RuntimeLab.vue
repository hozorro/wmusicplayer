<script setup lang="ts">
/**
 * P1验收台（DEV专用，不进生产包）
 * 复现iOS锁屏切歌的两个必要条件，同一audio节点 + MediaSession放挂起
 * 验收路径：点击“开始”（首次手势）-> 播放 -> 锁屏 -> 曲目A播放完毕自动播放曲目B
 */
import { ref, watch, onUnmounted } from 'vue'
import { createAudioRuntime } from '@/player/runtime';
import { EngineEvent } from '@/player/events'; 
import { getRandomTracks, getStreamingUrl } from '@/apis/methods/music';

const runtime = createAudioRuntime()
const index = ref(0)
const state = ref<string>('idle')
const logs = ref<string[]>([])
const tracks = ref<Track[]>([])
const isLoading = ref(false)
const urlCache = new Map<number, string>()

const push = (line: string) => logs.value.unshift(`${new Date().toLocaleTimeString()} ${line}`)

/** 当前曲目开始播放后，立即为下一首预解析 streamUrl */
async function prepareNext(i: number) {
  const next = tracks.value[(i + 1) % tracks.value.length]
  if (urlCache.has(next.id)) return
  try {
    const url = await getStreamingUrl(next.id).send()
    urlCache.set(next.id, `/api/${url}`)
    push(`prepare ${next.title} -> ${url}`)
  } catch (e) {
    push(`prepare ${next.title} failed: ${e}`)
  }
}

// async function loadAndPlay(i: number) {
//   isLoading.value = true
//   push(`load ${tracks.value[i].title}`)
//   const url = await getStreamingUrl(tracks.value[i].id).send()
//   await runtime.load(`/api/${url}`)
//   await runtime.play()
// }

async function startTest() {
  push('fetching random tracks...')
  try {
    tracks.value = await getRandomTracks(3).send()
    push(`got ${tracks.value.length} tracks: ${tracks.value.map(t => t.title).join(', ')}`)
    advanceTo(0)
  } catch (e: any) {
    push(`init error: ${e.message}`)
  } finally {
    isLoading.value = false
  }
}

function advanceTo(i: number) {
  const track = tracks.value[i]
  const url = urlCache.get(track.id)
  urlCache.delete(track.id)
  if (url) {
    push(`swap -> ${track.title}`)
    runtime.swapAndPlay(url)
  } else {
    // 兜底：仅应出现在预解析失败的边缘场景，此路径自带被杀风险，只能接受它
    push(`cache miss -> ${track.title}, inline fetch`)
    getStreamingUrl(track.id).send().then(u => runtime.swapAndPlay(`/api/${u}`))
  }
  prepareNext(i)
}

runtime.on(EngineEvent.StateChanged, s => {
  state.value = s
  push(`state changed: ${s}`)
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = s === 'playing' ? 'playing' : 'paused'
  }
})

runtime.on(EngineEvent.Ended, () => {
  push('ended -> advance')
  index.value = (index.value + 1) % tracks.value.length
  advanceTo(index.value)
})

runtime.on(EngineEvent.Error, e => push(`error: ${e?.message ?? e?.code}`))

// 最小 MediaSession：仅为复现防挂起条件
if ('mediaSession' in navigator) {
  const applyMetadata = (i: number) => {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: tracks.value[i]?.title || 'Unknown Title',
      artist: 'Harness',
      album: 'P1 Harness'
    })
  }
  navigator.mediaSession.setActionHandler('play', () => runtime.play())
  navigator.mediaSession.setActionHandler('pause', () => runtime.pause())
  navigator.mediaSession.setActionHandler('nexttrack', () => {
    index.value = (index.value + 1) % tracks.value.length
    advanceTo(index.value)
  })
  navigator.mediaSession.setActionHandler('previoustrack', () => {
    index.value = (index.value - 1 + tracks.value.length) % tracks.value.length
    advanceTo(index.value)
  })
  watch(index, applyMetadata, {flush: 'sync'})
  applyMetadata(0)
}

onUnmounted(() => runtime.dispose())
</script>

<template>
  <main class=" max-w-120 mx-auto p-6">
    <h1 class=" font-bold text-xl mb-2">Runtime Lab</h1>
    <p class=" mb-4">
      当前：<strong>{{ tracks[index]?.title || 'Unknown Title' }}</strong>
       | 状态：<strong>{{ state }}</strong>
    </p>
    <button
        class="px-4 h-9 bg-cyan-600 text-white rounded-md text-sm disabled:opacity-50 mb-4"
        :disabled="isLoading || tracks.length > 0"
        @click="startTest"
      >
      开始
    </button>
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