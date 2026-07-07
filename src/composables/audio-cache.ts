/**
 * Audio Blob URL Cache
 *
 * Pre-fetches audio data as Blob URLs for seamless track switching.
 * Uses LRU eviction with max entries and total size limits.
 * Module-level singleton — shared across component instances, independent of Vue reactivity.
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

// Map preserves insertion order — used as LRU: access via delete + set moves to end (most recent)
const cache = new Map<number, AudioCacheEntry>()
// Tracks in-flight downloads to prevent duplicate requests for the same trackId
const loadingPromises = new Map<number, Promise<string | null>>()
// Marks trackIds whose cache was invalidated while a download was in progress;
// the result will be discarded in the then() callback
const invalidatedSet = new Set<number>()

/**
 * Fetch audio data for a track and create a Blob URL.
 * Internal: getStreamingUrl(tid) → fetch(/api/{url}) → blob → URL.createObjectURL
 */
async function _fetchAudioBlob(trackId: number): Promise<{ blobUrl: string; blob: Blob } | null> {
  const streamUrl = await getStreamingUrl(trackId)
  const response = await fetch(`/api/${streamUrl}`)
  if (!response.ok) return null
  const blob = await response.blob()
  if (blob.size === 0) return null
  return { blobUrl: URL.createObjectURL(blob), blob }
}

/**
 * LRU eviction: evict oldest entries until under both count and size limits.
 */
function _evictIfNeeded(incomingSize: number): void {
  // Count-based eviction
  while (cache.size >= MAX_ENTRIES) {
    _evictOldest()
  }
  // Total-size-based eviction
  let totalSize = _getTotalSize() + incomingSize
  while (totalSize > MAX_TOTAL_SIZE && cache.size > 0) {
    const evictedSize = _evictOldest()
    totalSize -= evictedSize
  }
}

function _evictOldest(): number {
  const oldestKey = cache.keys().next().value
  if (oldestKey === undefined) return 0
  const entry = cache.get(oldestKey)
  if (!entry) return 0
  URL.revokeObjectURL(entry.blobUrl)
  cache.delete(oldestKey)
  return entry.size
}

function _getTotalSize(): number {
  let total = 0
  for (const entry of cache.values()) total += entry.size
  return total
}

/**
 * Preload a track's audio data as Blob URL.
 * Idempotent: skips if already cached or currently loading.
 */
function preloadTrack(trackId: number): void {
  if (trackId <= 0) return
  if (cache.has(trackId)) return
  if (loadingPromises.has(trackId)) return

  const promise = _fetchAudioBlob(trackId)
    .then(result => {
      loadingPromises.delete(trackId)
      if (!result) return null

      // If invalidated during download, discard the result
      if (invalidatedSet.has(trackId)) {
        invalidatedSet.delete(trackId)
        URL.revokeObjectURL(result.blobUrl)
        return null
      }

      _evictIfNeeded(result.blob.size)

      cache.set(trackId, {
        trackId,
        blobUrl: result.blobUrl,
        blob: result.blob,
        size: result.blob.size,
        createdAt: Date.now(),
      })
      console.log(`[AudioCache] Preloaded track ${trackId} (${(result.blob.size / 1024 / 1024).toFixed(1)}MB)`)
      return result.blobUrl
    })
    .catch(err => {
      console.warn(`[AudioCache] Failed to preload track ${trackId}:`, err)
      loadingPromises.delete(trackId)
      return null
    })

  loadingPromises.set(trackId, promise)
}

/**
 * Synchronously return a cached Blob URL, or null if not ready.
 * Performs LRU update on hit (delete + set moves to most-recent position).
 */
function getCachedUrlSync(trackId: number): string | null {
  const entry = cache.get(trackId)
  if (entry) {
    cache.delete(trackId)
    cache.set(trackId, entry)
    return entry.blobUrl
  }
  return null
}

/**
 * Asynchronously get a cached Blob URL.
 * Returns immediately if cache is ready; awaits in-flight download if one exists.
 * Returns null if the track was never preloaded.
 */
async function getCachedUrl(trackId: number): Promise<string | null> {
  const syncUrl = getCachedUrlSync(trackId)
  if (syncUrl) return syncUrl

  const loadingPromise = loadingPromises.get(trackId)
  if (loadingPromise) {
    return await loadingPromise
  }
  return null
}

/**
 * Check if a track is cached or currently loading (without LRU side effects).
 */
function has(trackId: number): boolean {
  return cache.has(trackId) || loadingPromises.has(trackId)
}

/**
 * Invalidate a specific track's cache entry.
 * Revokes the Blob URL and marks the trackId so in-flight downloads are discarded.
 */
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

/**
 * Clear all cached entries and revoke all Blob URLs.
 */
function clearAll(): void {
  for (const entry of cache.values()) {
    URL.revokeObjectURL(entry.blobUrl)
  }
  cache.clear()
  loadingPromises.clear()
  invalidatedSet.clear()
}

/**
 * Get cache statistics for debugging/monitoring.
 */
function getStats(): { count: number; totalSize: number; trackIds: number[] } {
  return {
    count: cache.size,
    totalSize: _getTotalSize(),
    trackIds: [...cache.keys()],
  }
}

export const audioCache = {
  preloadTrack,
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
