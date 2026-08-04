<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { getRandomTracks, getStreamingUrl } from '@/apis/methods/music'

// --- State ---
const tracks = ref<Track[]>([])
const currentIndex = ref(-1)
const logs = ref<string[]>([])
const isPlaying = ref(false)
const isLoading = ref(false)

// --- Audio & Prefetch ---
const audioRef = ref<HTMLAudioElement | null>(null)
let currentObjectUrl: string | null = null
let nextBlob: Blob | null = null
let prefetchTimer: ReturnType<typeof setTimeout> | null = null

// --- Helpers ---
function addLog(msg: string) {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 } as Intl.DateTimeFormatOptions)
  logs.value.unshift(`[${time}] ${msg}`)
  if (logs.value.length > 50) logs.value.pop()
}

async function fetchTrackBlob(trackId: number): Promise<Blob> {
  const signedUrl = await getStreamingUrl(trackId).send()
  addLog(`signed URL obtained for track #${trackId}: ${signedUrl}`)
  const resp = await fetch(`/api/${signedUrl}`)
  if (!resp.ok) throw new Error(`fetch failed: ${resp.status}`)
  const blob = await resp.blob()
  addLog(`blob downloaded for track #${trackId} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`)
  return blob
}

function revokeCurrentUrl() {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = null
  }
}

function updateMediaSession(track: Track) {
  if (!('mediaSession' in navigator)) return
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
    album: 'LockScreen Test',
  })
}

function setupMediaSessionHandlers() {
  if (!('mediaSession' in navigator)) return
  navigator.mediaSession.setActionHandler('play', () => {
    audioRef.value?.play()
    addLog('MediaSession: play')
  })
  navigator.mediaSession.setActionHandler('pause', () => {
    audioRef.value?.pause()
    addLog('MediaSession: pause')
  })
  navigator.mediaSession.setActionHandler('nexttrack', () => {
    addLog('MediaSession: nexttrack triggered')
    playNext()
  })
  navigator.mediaSession.setActionHandler('previoustrack', () => {
    addLog('MediaSession: previoustrack triggered')
    playPrev()
  })
}

// --- Prefetch ---
function schedulePrefetch() {
  clearPrefetchTimer()
  const nextIdx = currentIndex.value + 1
  if (nextIdx >= tracks.value.length) {
    addLog('prefetch: no next track, skip')
    return
  }
  prefetchTimer = setTimeout(async () => {
    try {
      addLog(`prefetch: start downloading next track #${tracks.value[nextIdx].id}`)
      nextBlob = await fetchTrackBlob(tracks.value[nextIdx].id)
      addLog('prefetch: next blob ready')
    } catch (e: any) {
      addLog(`prefetch failed: ${e.message}`)
      nextBlob = null
    }
  }, 3000)
}

function clearPrefetchTimer() {
  if (prefetchTimer) {
    clearTimeout(prefetchTimer)
    prefetchTimer = null
  }
}

// --- Playback ---
async function playTrackAt(index: number) {
  if (index < 0 || index >= tracks.value.length) return
  const audio = audioRef.value
  if (!audio) return

  isLoading.value = true
  currentIndex.value = index
  const track = tracks.value[index]
  addLog(`loading track [${index}] "${track.title}"`)

  try {
    let blob: Blob
    // 如果是预取好的下一首，直接使用
    if (nextBlob && index === currentIndex.value) {
      blob = nextBlob
      nextBlob = null
      addLog('using prefetched blob')
    } else {
      nextBlob = null
      blob = await fetchTrackBlob(track.id)
    }

    revokeCurrentUrl()
    currentObjectUrl = URL.createObjectURL(blob)
    audio.src = currentObjectUrl
    await audio.play()
    isPlaying.value = true
    addLog(`playing [${index}] "${track.title}"`)
    updateMediaSession(track)
    schedulePrefetch()
  } catch (e: any) {
    addLog(`play error: ${e.message}`)
  } finally {
    isLoading.value = false
  }
}

async function playNext() {
  const nextIdx = currentIndex.value + 1
  if (nextIdx >= tracks.value.length) {
    addLog('reached end of list')
    return
  }
  // 如果预取的正好是下一首
  const blob = nextBlob
  nextBlob = null
  clearPrefetchTimer()
  revokeCurrentUrl()

  currentIndex.value = nextIdx
  const track = tracks.value[nextIdx]
  const audio = audioRef.value
  if (!audio) return

  isLoading.value = true
  try {
    let finalBlob: Blob
    if (blob) {
      finalBlob = blob
      addLog(`next: using prefetched blob for [${nextIdx}] "${track.title}"`)
    } else {
      addLog(`next: fetching [${nextIdx}] "${track.title}"`)
      finalBlob = await fetchTrackBlob(track.id)
    }
    currentObjectUrl = URL.createObjectURL(finalBlob)
    audio.src = currentObjectUrl
    await audio.play()
    isPlaying.value = true
    addLog(`playing [${nextIdx}] "${track.title}"`)
    updateMediaSession(track)
    schedulePrefetch()
  } catch (e: any) {
    addLog(`next play error: ${e.message}`)
  } finally {
    isLoading.value = false
  }
}

async function playPrev() {
  const prevIdx = currentIndex.value - 1
  if (prevIdx < 0) {
    addLog('already at first track')
    return
  }
  nextBlob = null
  clearPrefetchTimer()
  await playTrackAt(prevIdx)
}

// --- Init ---
async function startTest() {
  addLog('fetching random tracks...')
  try {
    const result = await getRandomTracks(5).send()
    tracks.value = result
    addLog(`got ${result.length} tracks: ${result.map(t => t.title).join(', ')}`)
    setupMediaSessionHandlers()
    await playTrackAt(0)
  } catch (e: any) {
    addLog(`init error: ${e.message}`)
  }
}

function onEnded() {
  addLog(`ended event fired at [${currentIndex.value}]`)
  playNext()
}

// --- Cleanup ---
onBeforeUnmount(() => {
  clearPrefetchTimer()
  revokeCurrentUrl()
  audioRef.value?.pause()
})
</script>

<template>
  <div class="p-4 max-w-md mx-auto">
    <h1 class="text-lg font-bold mb-2">锁屏自动切歌试验</h1>
    <p class="text-sm text-gray-500 mb-4">
      方案：单 audio + ended 事件 + MediaSession + 3s 预取 Blob
    </p>

    <!-- Audio Element -->
    <audio ref="audioRef" controls class="w-full mb-4" @ended="onEnded" />

    <!-- Controls -->
    <div class="flex gap-2 mb-4">
      <button
        class="px-4 h-9 bg-cyan-600 text-white rounded-md text-sm disabled:opacity-50"
        :disabled="isLoading || tracks.length > 0"
        @click="startTest"
      >
        开始播放
      </button>
      <button
        class="px-4 h-9 bg-gray-200 rounded-md text-sm disabled:opacity-50"
        :disabled="currentIndex <= 0 || isLoading"
        @click="playPrev"
      >
        上一首
      </button>
      <button
        class="px-4 h-9 bg-gray-200 rounded-md text-sm disabled:opacity-50"
        :disabled="currentIndex >= tracks.length - 1 || isLoading"
        @click="playNext"
      >
        下一首
      </button>
    </div>

    <!-- Current Track Info -->
    <div v-if="currentIndex >= 0 && tracks[currentIndex]" class="mb-4 p-2 bg-gray-50 rounded-md text-sm">
      <div class="font-medium">[{{ currentIndex + 1 }}/{{ tracks.length }}] {{ tracks[currentIndex].title }}</div>
      <div class="text-gray-500">{{ tracks[currentIndex].artists?.map(a => a.name).join(', ') }}</div>
    </div>

    <!-- Event Log -->
    <div class="border rounded-md p-2">
      <div class="text-xs font-semibold text-gray-400 mb-1">事件日志</div>
      <div class="max-h-64 overflow-y-auto text-xs font-mono space-y-0.5">
        <div v-for="(log, i) in logs" :key="i" class="text-gray-700">{{ log }}</div>
        <div v-if="logs.length === 0" class="text-gray-400">等待操作...</div>
      </div>
    </div>
  </div>
</template>