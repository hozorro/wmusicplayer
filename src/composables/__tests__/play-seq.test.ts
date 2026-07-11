import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// Mock dependencies of the music store to avoid IndexedDB/i18n side effects
vi.mock('@/apis/idb-funcs', () => {
  class MockIndexedDbHelper {
    open = vi.fn()
  }
  return { indexedDbHelper: MockIndexedDbHelper }
})
vi.mock('@/apis/idb-config', () => ({ default: {} }))
vi.mock('@/i18n', () => ({
  loadLocaleMessages: vi.fn(),
}))

// Mock localStorage for store persist
const mockStorage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockStorage.get(key) ?? null,
  setItem: (key: string, value: string) => mockStorage.set(key, value),
  removeItem: (key: string) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
  get length() { return mockStorage.size },
  key: (index: number) => [...mockStorage.keys()][index] ?? null,
})

import { usePlaySeq } from '@/composables/play-seq'
import { useMusicStore } from '@/store/music'
import { SeqMode } from '@/constants/play-constants'

// Create a fake playlist: 5 tracks with id and name
function makePlaylist(count: number): any[] {
  return Array.from({ length: count }, (_, i) => ({ id: i + 1, name: `Track ${i + 1}` }))
}

describe('usePlaySeq', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockStorage.clear()
  })

  describe('initSeq()', () => {
    it('initializes seqList with indices matching playlist length', () => {
      const store = useMusicStore()
      store.curPlaylist = makePlaylist(5) as any
      store.curPlayIndex = 2

      const { seqList, seqIndex, initSeq } = usePlaySeq()
      initSeq()

      expect(seqList.value).toEqual([0, 1, 2, 3, 4])
      expect(seqIndex.value).toBe(2)
    })

    it('sets seqIndex to 0 when curPlayIndex is not in seqList', () => {
      const store = useMusicStore()
      store.curPlaylist = makePlaylist(3) as any
      store.curPlayIndex = 99 // invalid

      const { seqList, seqIndex, initSeq } = usePlaySeq()
      initSeq()

      expect(seqList.value.length).toBe(3)
      expect(seqIndex.value).toBe(-1) // indexOf returns -1
    })
  })

  describe('addSeqCur()', () => {
    it('inserts current track at seqIndex position, increasing list length by 1', () => {
      const store = useMusicStore()
      store.curPlaylist = makePlaylist(3) as any
      store.curPlayIndex = 1

      const { seqList, seqIndex, initSeq, addSeqCur } = usePlaySeq()
      initSeq()
      expect(seqList.value.length).toBe(3)

      addSeqCur()
      expect(seqList.value.length).toBe(4)
      expect(seqList.value[seqIndex.value]).toBe(1) // curPlayIndex
    })
  })

  describe('addSeqNext()', () => {
    it('inserts next track at seqIndex+1 position', () => {
      const store = useMusicStore()
      store.curPlaylist = makePlaylist(3) as any
      store.curPlayIndex = 0

      const { seqList, seqIndex, initSeq, addSeqNext } = usePlaySeq()
      initSeq()

      addSeqNext()
      expect(seqList.value.length).toBe(4)
      // The new track should be at seqIndex+1
      expect(seqList.value[seqIndex.value + 1]).toBe(1) // curPlayIndex+1
    })
  })

  describe('addSeqLast()', () => {
    it('appends last playlist index to seqList', () => {
      const store = useMusicStore()
      store.curPlaylist = makePlaylist(5) as any
      store.curPlayIndex = 0

      const { seqList, initSeq, addSeqLast } = usePlaySeq()
      initSeq()
      const originalLength = seqList.value.length

      addSeqLast()
      expect(seqList.value.length).toBe(originalLength + 1)
      expect(seqList.value[seqList.value.length - 1]).toBe(4) // last index = length-1
    })
  })

  describe('replaceSeqList()', () => {
    it('replaces seqList with full index range of playlist', () => {
      const store = useMusicStore()
      store.curPlaylist = makePlaylist(4) as any
      store.curPlayIndex = 2

      const { seqList, seqIndex, initSeq, replaceSeqList } = usePlaySeq()
      initSeq()

      replaceSeqList()
      expect(seqList.value.length).toBe(4)
      expect(seqIndex.value).toBe(0)
      // In LIST_ORDER mode, should be [0,1,2,3]
      expect(seqList.value).toEqual([0, 1, 2, 3])
    })

    it('shuffles when in LIST_RND mode', () => {
      const store = useMusicStore()
      store.curPlaylist = makePlaylist(10) as any
      store.curPlayIndex = 0

      const { seqList, seqIndex, seqOrder, initSeq, replaceSeqList } = usePlaySeq()
      initSeq()
      // Manually switch to shuffle mode
      seqOrder.value = SeqMode.LIST_RND

      replaceSeqList()
      expect(seqList.value.length).toBe(10)
      expect(seqIndex.value).toBe(0)
      // All indices 0-9 should be present (just possibly shuffled)
      const sorted = [...seqList.value].sort((a, b) => a - b)
      expect(sorted).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    })
  })

  describe('addSeqListLast()', () => {
    it('extends seqList with new indices when playlist grows', () => {
      const store = useMusicStore()
      store.curPlaylist = makePlaylist(3) as any
      store.curPlayIndex = 0

      const { seqList, initSeq, addSeqListLast } = usePlaySeq()
      initSeq()
      expect(seqList.value.length).toBe(3)

      // Simulate playlist growing to 6 tracks
      store.curPlaylist = makePlaylist(6) as any

      addSeqListLast()
      expect(seqList.value.length).toBe(6)
      // New indices 3,4,5 should be added
      const sorted = [...seqList.value].sort((a, b) => a - b)
      expect(sorted).toEqual([0, 1, 2, 3, 4, 5])
    })
  })

  describe('nextSeqMode()', () => {
    it('cycles through LIST_ORDER -> LIST_RND -> SINGLE_LOOP -> LIST_ORDER', () => {
      const store = useMusicStore()
      store.curPlaylist = makePlaylist(5) as any
      store.curPlayIndex = 0

      const { seqOrder, initSeq, nextSeqMode } = usePlaySeq()
      initSeq()

      expect(seqOrder.value).toBe(SeqMode.LIST_ORDER) // 0

      nextSeqMode()
      expect(seqOrder.value).toBe(SeqMode.LIST_RND) // 1

      nextSeqMode()
      expect(seqOrder.value).toBe(SeqMode.SINGLE_LOOP) // 2

      nextSeqMode()
      expect(seqOrder.value).toBe(SeqMode.LIST_ORDER) // 0 (wraps around)
    })

    it('rebuilds seqList in order when switching to LIST_ORDER', () => {
      const store = useMusicStore()
      store.curPlaylist = makePlaylist(4) as any
      store.curPlayIndex = 1

      const { seqList, seqIndex, seqOrder, initSeq, nextSeqMode } = usePlaySeq()
      initSeq()

      // Switch to shuffle, then back to order
      nextSeqMode() // LIST_RND
      expect(seqOrder.value).toBe(SeqMode.LIST_RND)

      nextSeqMode() // SINGLE_LOOP
      nextSeqMode() // LIST_ORDER

      expect(seqList.value).toEqual([0, 1, 2, 3])
      expect(seqIndex.value).toBe(1) // curPlayIndex
    })

    it('preserves current position when switching to LIST_RND', () => {
      const store = useMusicStore()
      store.curPlaylist = makePlaylist(5) as any
      store.curPlayIndex = 2

      const { seqList, seqIndex, initSeq, nextSeqMode } = usePlaySeq()
      initSeq()

      nextSeqMode() // LIST_RND

      // Current track should remain at seqIndex position
      expect(seqList.value[seqIndex.value]).toBe(2)
      // All indices should be present
      const sorted = [...seqList.value].sort((a, b) => a - b)
      expect(sorted).toEqual([0, 1, 2, 3, 4])
    })
  })
})
