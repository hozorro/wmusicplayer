import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock getStreamingUrl BEFORE importing audioCache
vi.mock('@/apis/methods/music', () => ({
  getStreamingUrl: vi.fn(),
}))

import { audioCache } from '@/composables/audio-cache'
import { getStreamingUrl } from '@/apis/methods/music'

const mockGetStreamingUrl = vi.mocked(getStreamingUrl)

// Spy on URL.createObjectURL / revokeObjectURL
const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation(
  (obj: Blob | MediaSource) => `blob:mock-${(obj as any).__id || 'url'}`
)
const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

function makeFakeBlob(size = 1024): Blob {
  const blob = new Blob([new Uint8Array(size)]) as Blob & { __id: string }
  blob.__id = `blob-${Math.random().toString(36).slice(2, 8)}`
  return blob
}

function setupFetchMock(blob?: Blob) {
  const b = blob ?? makeFakeBlob()
  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    blob: () => Promise.resolve(b),
  })
  vi.stubGlobal('fetch', mockFetch)
  return { mockFetch, blob: b }
}

describe('audioCache', () => {
  beforeEach(() => {
    audioCache.clearAll()
    vi.clearAllMocks()
    createObjectURLSpy.mockClear()
    revokeObjectURLSpy.mockClear()
    mockGetStreamingUrl.mockImplementation(((tid: number) =>
      Promise.resolve(`music/track/stream/${tid}`)
    ) as any)
    setupFetchMock()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('preloadTrack()', () => {
    it('adds track to cache after preload completes', async () => {
      audioCache.preloadTrack(1)
      const url = await audioCache.getCachedUrl(1)
      expect(url).not.toBeNull()
      expect(audioCache.has(1)).toBe(true)
    })

    it('calls getStreamingUrl and fetch with correct URL', async () => {
      const { mockFetch } = setupFetchMock()
      audioCache.preloadTrack(42)
      await audioCache.getCachedUrl(42)

      expect(mockGetStreamingUrl).toHaveBeenCalledWith(42)
      expect(mockFetch).toHaveBeenCalledWith('/api/music/track/stream/42')
    })

    it('does not preload trackId <= 0', () => {
      audioCache.preloadTrack(0)
      audioCache.preloadTrack(-1)
      expect(mockGetStreamingUrl).not.toHaveBeenCalled()
      expect(audioCache.has(0)).toBe(false)
    })

    it('does not re-fetch if already cached', async () => {
      audioCache.preloadTrack(5)
      await audioCache.getCachedUrl(5)
      const callCount = mockGetStreamingUrl.mock.calls.length

      audioCache.preloadTrack(5) // second call
      expect(mockGetStreamingUrl).toHaveBeenCalledTimes(callCount)
    })

    it('does not re-fetch if currently loading', () => {
      audioCache.preloadTrack(7)
      audioCache.preloadTrack(7) // duplicate while loading
      // getStreamingUrl called only once
      expect(mockGetStreamingUrl).toHaveBeenCalledTimes(1)
    })

    it('does not crash if fetch fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
      audioCache.preloadTrack(99)
      const url = await audioCache.getCachedUrl(99)
      expect(url).toBeNull()
    })

    it('does not cache if fetch returns non-ok response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
      audioCache.preloadTrack(10)
      const url = await audioCache.getCachedUrl(10)
      expect(url).toBeNull()
    })

    it('does not cache if blob is empty', async () => {
      const emptyBlob = new Blob([])
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(emptyBlob),
      }))
      audioCache.preloadTrack(11)
      const url = await audioCache.getCachedUrl(11)
      expect(url).toBeNull()
    })
  })

  describe('getCachedUrlSync()', () => {
    it('returns null when not cached', () => {
      expect(audioCache.getCachedUrlSync(1)).toBeNull()
    })

    it('returns URL after preload completes', async () => {
      audioCache.preloadTrack(2)
      await audioCache.getCachedUrl(2)
      const url = audioCache.getCachedUrlSync(2)
      expect(url).not.toBeNull()
      expect(typeof url).toBe('string')
    })

    it('updates LRU order on access', async () => {
      // Preload 3 tracks to fill cache
      audioCache.preloadTrack(1)
      audioCache.preloadTrack(2)
      audioCache.preloadTrack(3)
      await audioCache.getCachedUrl(1)
      await audioCache.getCachedUrl(2)
      await audioCache.getCachedUrl(3)

      // Access track 1 to make it most-recently-used
      audioCache.getCachedUrlSync(1)

      // Add 4th track → oldest (track 2, not 1) should be evicted
      setupFetchMock(makeFakeBlob(1024))
      audioCache.preloadTrack(4)
      await audioCache.getCachedUrl(4)

      expect(audioCache.getCachedUrlSync(2)).toBeNull() // evicted
      expect(audioCache.getCachedUrlSync(1)).not.toBeNull() // still cached
    })
  })

  describe('getCachedUrl() (async)', () => {
    it('awaits in-flight preload and returns URL', async () => {
      audioCache.preloadTrack(3)
      // getCachedUrl immediately after preloadTrack — should await the loading promise
      const url = await audioCache.getCachedUrl(3)
      expect(url).not.toBeNull()
    })

    it('returns null if track was never preloaded', async () => {
      const url = await audioCache.getCachedUrl(999)
      expect(url).toBeNull()
    })
  })

  describe('has()', () => {
    it('returns false for unknown track', () => {
      expect(audioCache.has(100)).toBe(false)
    })

    it('returns true while track is loading', () => {
      audioCache.preloadTrack(20)
      expect(audioCache.has(20)).toBe(true) // still loading
    })

    it('returns true when cached', async () => {
      audioCache.preloadTrack(21)
      await audioCache.getCachedUrl(21)
      expect(audioCache.has(21)).toBe(true)
    })
  })

  describe('invalidate()', () => {
    it('removes cached entry and revokes Blob URL', async () => {
      audioCache.preloadTrack(30)
      await audioCache.getCachedUrl(30)
      const url = audioCache.getCachedUrlSync(30)

      audioCache.invalidate(30)
      expect(audioCache.has(30)).toBe(false)
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(url)
    })

    it('marks in-flight preload as invalidated (result discarded)', async () => {
      // Start preloading
      audioCache.preloadTrack(31)
      // Invalidate while loading
      audioCache.invalidate(31)
      // Wait for loading promise to settle
      const url = await audioCache.getCachedUrl(31)
      // Result was discarded
      expect(url).toBeNull()
      expect(audioCache.has(31)).toBe(false)
    })
  })

  describe('LRU eviction', () => {
    it('evicts oldest entry when MAX_ENTRIES (3) is exceeded', async () => {
      audioCache.preloadTrack(1)
      audioCache.preloadTrack(2)
      audioCache.preloadTrack(3)
      await audioCache.getCachedUrl(1)
      await audioCache.getCachedUrl(2)
      await audioCache.getCachedUrl(3)

      // Adding 4th → oldest (track 1) should be evicted
      audioCache.preloadTrack(4)
      await audioCache.getCachedUrl(4)

      expect(audioCache.has(1)).toBe(false)
      expect(audioCache.has(2)).toBe(true)
      expect(audioCache.has(3)).toBe(true)
      expect(audioCache.has(4)).toBe(true)
    })
  })

  describe('clearAll()', () => {
    it('revokes all Blob URLs and empties cache', async () => {
      audioCache.preloadTrack(1)
      audioCache.preloadTrack(2)
      await audioCache.getCachedUrl(1)
      await audioCache.getCachedUrl(2)

      audioCache.clearAll()

      expect(audioCache.getStats().count).toBe(0)
      expect(audioCache.has(1)).toBe(false)
      expect(audioCache.has(2)).toBe(false)
      // revokeObjectURL called for each cached entry
      expect(revokeObjectURLSpy.mock.calls.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('getStats()', () => {
    it('returns correct count and trackIds', async () => {
      audioCache.preloadTrack(10)
      audioCache.preloadTrack(20)
      await audioCache.getCachedUrl(10)
      await audioCache.getCachedUrl(20)

      const stats = audioCache.getStats()
      expect(stats.count).toBe(2)
      expect(stats.trackIds).toContain(10)
      expect(stats.trackIds).toContain(20)
      expect(stats.totalSize).toBeGreaterThan(0)
    })

    it('returns empty stats after clearAll', () => {
      audioCache.clearAll()
      const stats = audioCache.getStats()
      expect(stats.count).toBe(0)
      expect(stats.trackIds).toEqual([])
      expect(stats.totalSize).toBe(0)
    })
  })
})
