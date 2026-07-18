import type { PlayerTrack } from "../types";
import type { IAudioSourceProvider } from "./interfaces";
import { getStreamingUrl } from '@/apis/methods/music'

export interface AudioSourceOptions {
  maxCacheSize: number
}

interface CacheEntry {
  trackId: number
  blob: Blob
  objectUrl: string
  size: number
  createdAt: number
}

const DEFAULT_OPTIONS: AudioSourceOptions = {
  maxCacheSize: 50 * 1024 * 1024
}

export function createAudioSource(options: Partial<AudioSourceOptions> = {}): IAudioSourceProvider {
  const resolvedOptions = { ...DEFAULT_OPTIONS, ...options };

  const cache  = new Map<number, CacheEntry>();

  const loadingPromises = new Map<number, Promise<string>>();

  let cacheSize = 0;

  function getCacheEntry(trackId: number): CacheEntry | undefined {
    const entry = cache.get(trackId);
    if (!entry) return
    if (!entry.objectUrl) {
      cache.delete(trackId)
      return
    }
    return entry
  }

  function putCache(trackId: number, blob: Blob, objectUrl: string): void {
    const entry: CacheEntry = {
      trackId: trackId,
      blob: blob,
      objectUrl: objectUrl,
      size: blob.size,
      createdAt: Date.now()
    };
    cache.set(trackId, entry);
    cacheSize += entry.size;
    evictCache();
  }

  function evictCache(): void {
    while (cacheSize > resolvedOptions.maxCacheSize && cache.size > 0) {
      const oldest = cache.entries().next().value;
      if (!oldest) break;
      const [trackId, entry] = oldest
      cache.delete(trackId);
      cacheSize -= entry.size;
      URL.revokeObjectURL(entry.objectUrl);
    }
  }

  async function fetchAndCache(track: PlayerTrack, signal?: AbortSignal): Promise<string> {
    const streamUrl = await getStreamingUrl(track.id)
    const response = await fetch(`/api/${streamUrl}`, { signal })
    if (!response.ok) {
      throw new Error(`Failed to fetch track: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      putCache(track.id, blob, objectUrl);
      return objectUrl;
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }
  }

  function createLoadingPromise(track: PlayerTrack, signal?: AbortSignal): Promise<string> {
    const promise = fetchAndCache(track, signal).finally(() => {
      loadingPromises.delete(track.id);
    });
    loadingPromises.set(track.id, promise);
    return promise;
  }

  async function resolve(track: PlayerTrack, signal?: AbortSignal): Promise<string> {
    const entry = getCacheEntry(track.id);
    if (entry) return entry.objectUrl;

    const loading = loadingPromises.get(track.id);
    if (loading) return loading;

    return createLoadingPromise(track, signal);
  }

  function clear(): void {
    for (const entry of cache.values()) {
      URL.revokeObjectURL(entry.objectUrl);
    }
    cache.clear()
    loadingPromises.clear()

    cacheSize = 0
  }

  return {
    resolve,
    clear
  };
}

