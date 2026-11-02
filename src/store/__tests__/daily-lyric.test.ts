import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const api = vi.hoisted(() => ({ getDailyLyric: vi.fn() }))
vi.mock('@/apis/methods/music', () => ({ getDailyLyric: api.getDailyLyric }))

// 与 queue.test.ts 一致：store 顶层会读 localStorage，测试环境需要桩
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(() => null),
}
globalThis.localStorage = localStorageMock as Storage

import { useMusicStore } from '../music'

const SAMPLE: DailyLyric = {
  lyric_id: 1,
  track_id: 2,
  album_id: 3,
  best: '那一年的夏天',
  title: '歌名',
  artists: ['歌手'],
  album: '专辑',
  duration: 200,
  path: 'a/b.lrc',
}

const methodOf = (data: DailyLyric | null) => ({ send: () => Promise.resolve(data) })

beforeEach(() => {
  setActivePinia(createPinia())
  api.getDailyLyric.mockReset()
})

describe('daily lyric cache', () => {
  it('requests once and keeps the local request date', async () => {
    api.getDailyLyric.mockReturnValue(methodOf(SAMPLE))
    const store = useMusicStore()

    await store.ensureDailyLyric()

    expect(api.getDailyLyric).toHaveBeenCalledTimes(1)
    expect(store.dailyLyric?.best).toBe(SAMPLE.best)
    expect(store.dailyLyricDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('does not request again on the same local day', async () => {
    api.getDailyLyric.mockReturnValue(methodOf(SAMPLE))
    const store = useMusicStore()

    await store.ensureDailyLyric()
    await store.ensureDailyLyric()

    expect(api.getDailyLyric).toHaveBeenCalledTimes(1)
  })

  it('requests again when the stored date is stale', async () => {
    api.getDailyLyric.mockReturnValue(methodOf({ ...SAMPLE, best: '新的句子' }))
    const store = useMusicStore()
    store.dailyLyricDate = '2000-01-01'
    store.dailyLyric = SAMPLE

    await store.ensureDailyLyric()

    expect(api.getDailyLyric).toHaveBeenCalledTimes(1)
    expect(store.dailyLyric?.best).toBe('新的句子')
    expect(store.dailyLyricDate).not.toBe('2000-01-01')
  })

  it('keeps the stale date when the request fails so the next visit retries', async () => {
    api.getDailyLyric.mockReturnValue({ send: () => Promise.reject(new Error('offline')) })
    const store = useMusicStore()
    store.dailyLyricDate = '2000-01-01'

    await store.ensureDailyLyric()

    expect(store.dailyLyricDate).toBe('2000-01-01')
    expect(store.dailyLyricLoading).toBe(false)
  })

  it('ignores a concurrent second call', async () => {
    api.getDailyLyric.mockReturnValue(methodOf(SAMPLE))
    const store = useMusicStore()

    await Promise.all([store.ensureDailyLyric(), store.ensureDailyLyric()])

    expect(api.getDailyLyric).toHaveBeenCalledTimes(1)
  })

  it('refetches when the backend had no daily line, but only once per day', async () => {
    api.getDailyLyric.mockReturnValue(methodOf(null))
    const store = useMusicStore()

    await store.ensureDailyLyric()
    expect(store.dailyLyric).toBeNull()
    expect(store.dailyLyricDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    await store.ensureDailyLyric()
    expect(api.getDailyLyric).toHaveBeenCalledTimes(1)
  })
})
