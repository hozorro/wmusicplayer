/**
 * Audio Engine — Audio Source
 *
 * Manages audio file retrieval with LRU Blob URL caching.
 * Provides resolveSource() for playback and preload() for prefetching.
 * Independent of Engine — both Engine and Controllers can use it.
 *
 * Evolved from the original audio-cache.ts with the same LRU strategy.
 */

import { getStreamingUrl } from '@/apis/methods/music'

interface AudioCacheEntry {
  trackId: number
  blobUrl: string
  blob: Blob
  size: number
  createdAt: number
}

const MAX_ENTRIES = 3
const MAX_TOTAL_SIZE = 50 * 1024 * 1024 // 50MB

// Map preserves insertion order — used as LRU
const cache = new Map<number, AudioCacheEntry>()
const loadingPromises = new Map<number, Promise<string | null>>()
const invalidatedSet = new Set<number>()

/** Fetch audio data for a track and create a Blob URL */
async function fetchAudioBlob(trackId: number): Promise<{ blobUrl: string; blob: Blob } | null> {
  const streamUrl = await getStreamingUrl(trackId)
  const response = await fetch(`/api/${streamUrl}`)
  if (!response.ok) return null
  const blob = await response.blob()
  if (blob.size === 0) return null
  return { blobUrl: URL.createObjectURL(blob), blob }
}

/** LRU eviction: evict oldest entries until under both count and size limits */
function evictIfNeeded(incomingSize: number): void {
  while (cache.size >= MAX_ENTRIES) {
    evictOldest()
  }
  let totalSize = getTotalSize() + incomingSize
  while (totalSize > MAX_TOTAL_SIZE && cache.size > 0) {
    const evictedSize = evictOldest()
    totalSize -= evictedSize
  }
}

function evictOldest(): number {
  const oldestKey = cache.keys().next().value
  if (oldestKey === undefined) return 0
  const entry = cache.get(oldestKey)
  if (!entry) return 0
  URL.revokeObjectURL(entry.blobUrl)
  cache.delete(oldestKey)
  return entry.size
}

function getTotalSize(): number {
  let total = 0
  for (const entry of cache.values()) total += entry.size
  return total
}

/**
 * Preload a track's audio data as Blob URL.
 * Idempotent: skips if already cached or currently loading.
 */
function preload(trackId: number): void {
  if (trackId <= 0) return
  if (cache.has(trackId)) return
  if (loadingPromises.has(trackId)) return

  const promise = fetchAudioBlob(trackId)
    .then((result) => {
      loadingPromises.delete(trackId)
      if (!result) return null

      if (invalidatedSet.has(trackId)) {
        invalidatedSet.delete(trackId)
        URL.revokeObjectURL(result.blobUrl)
        return null
      }

      evictIfNeeded(result.blob.size)

      cache.set(trackId, {
        trackId,
        blobUrl: result.blobUrl,
        blob: result.blob,
        size: result.blob.size,
        createdAt: Date.now(),
      })
      console.log(`[AudioSource] Preloaded track ${trackId} (${(result.blob.size / 1024 / 1024).toFixed(1)}MB)`)
      return result.blobUrl
    })
    .catch((err) => {
      console.warn(`[AudioSource] Failed to preload track ${trackId}:`, err)
      loadingPromises.delete(trackId)
      return null
    })

  loadingPromises.set(trackId, promise)
}

/**
 * Resolve an audio source URL for a track.
 * Priority: cached Blob URL > in-flight preload > fresh fetch.
 */
async function resolveSource(trackId: number): Promise<string | null> {
  // 1. Check sync cache (with LRU update)
  const syncUrl = getCachedUrlSync(trackId)
  if (syncUrl) return syncUrl

  // 2. Check in-flight preload
  const loadingPromise = loadingPromises.get(trackId)
  if (loadingPromise) {
    return await loadingPromise
  }

  // 3. Fresh fetch
  const result = await fetchAudioBlob(trackId)
  if (!result) return null

  // Cache the result for future use
  evictIfNeeded(result.blob.size)
  cache.set(trackId, {
    trackId,
    blobUrl: result.blobUrl,
    blob: result.blob,
    size: result.blob.size,
    createdAt: Date.now(),
  })

  return result.blobUrl
}

/** Synchronously return a cached Blob URL (with LRU update on hit) */
function getCachedUrlSync(trackId: number): string | null {
  const entry = cache.get(trackId)
  if (entry) {
    cache.delete(trackId)
    cache.set(trackId, entry) // Move to end (most recent)
    return entry.blobUrl
  }
  return null
}

/** Asynchronously get a cached URL (waits for in-flight download if exists) */
async function getCachedUrl(trackId: number): Promise<string | null> {
  const syncUrl = getCachedUrlSync(trackId)
  if (syncUrl) return syncUrl
  const loadingPromise = loadingPromises.get(trackId)
  if (loadingPromise) return await loadingPromise
  return null
}

/** Check if a track is cached or currently loading (no LRU side effects) */
function has(trackId: number): boolean {
  return cache.has(trackId) || loadingPromises.has(trackId)
}

/** Invalidate a specific track's cache entry */
function invalidate(trackId: number): void {
  const entry = cache.get(trackId)
  if (entry) {
    URL.revokeObjectURL(entry.blobUrl)
    cache.delete(trackId)
  }
  if (loadingPromises.has(trackId)) {
    invalidatedSet.add(trackId)
  }
}

/** Clear all cached entries and revoke all Blob URLs */
function clearAll(): void {
  for (const entry of cache.values()) {
    URL.revokeObjectURL(entry.blobUrl)
  }
  cache.clear()
  loadingPromises.clear()
  invalidatedSet.clear()
}

/** Get cache statistics for debugging/monitoring */
function getStats(): { count: number; totalSize: number; trackIds: number[] } {
  return {
    count: cache.size,
    totalSize: getTotalSize(),
    trackIds: [...cache.keys()],
  }
}

export const audioSource = {
  resolveSource,
  preload,
  getCachedUrlSync,
  getCachedUrl,
  has,
  invalidate,
  clearAll,
  getStats,
}

// HMR: clean up Blob URLs when the module is replaced
if (import.meta.hot) {
  import.meta.hot.dispose(() => clearAll())
}
