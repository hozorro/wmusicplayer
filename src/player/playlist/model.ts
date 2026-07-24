/**
 * Playlist Model — Pure Data Model
 *
 * Manages tracks, playback sequence (seqList/seqIndex), and sequence mode.
 * Pure object with NO Vue reactivity — can be independently tested.
 * Replaces the old play-seq.ts composable.
 */

import { SeqMode, PlayChangeMode } from '@/constants/play-constants'
import { shuffle } from '@/utilies/general'
import type { NavResult } from './types'

export interface PlaylistModel {
  // --- State ---
  readonly tracks: Track[]
  readonly currentIndex: number
  readonly seqList: number[]
  readonly seqIndex: number
  readonly mode: SeqMode

  // --- Navigation ---
  /** Get the next index according to current mode. Returns null if at end (no loop). */
  next(isLoop: boolean): NavResult | null
  /** Get the previous index according to current mode. Returns null if at start (no loop). */
  prev(isLoop: boolean): NavResult | null

  // --- Sequence Mode ---
  /** Switch to the next mode (LIST_ORDER -> LIST_RND -> SINGLE_LOOP -> ...) */
  cycleMode(): void
  /** Set a specific mode, reshuffling if needed */
  setMode(mode: SeqMode): void

  // --- Playlist Mutation ---
  /** Initialize sequence from current tracks */
  initSeq(): void
  /** Handle a playlist change according to PlayChangeMode */
  handleChange(mode: PlayChangeMode): void
  /** Set tracks and current index (used for external sync) */
  setTracks(tracks: Track[], currentIndex: number): void
  /** Remove a track by playlist index and adjust sequence */
  removeTrack(removeIndex: number): { shouldPlayNext: boolean; nextIndex: number | null }
  /** Jump to a specific playlist index */
  jumpTo(index: number): void

  // --- Queries ---
  /** Get the track ID at the current position */
  getCurrentTrackId(): number | null
  /** Get the track ID that would play next */
  getNextTrackId(isLoop: boolean): number | null
  /** Get the track ID that would play previous */
  getPrevTrackId(isLoop: boolean): number | null
}

/**
 * Create a PlaylistModel instance.
 */
export function createPlaylistModel(): PlaylistModel {
  let tracks: Track[] = []
  let currentIndex = 0
  let seqList: number[] = []
  let seqIndex = 0
  let mode: SeqMode = SeqMode.LIST_ORDER

  // --- Internal helpers ---

  function rebuildSeqList(): void {
    seqList = [...new Array(tracks.length).keys()]
  }

  function shuffleFromCurrent(): void {
    // Keep already-played items, shuffle remaining (excluding current)
    const preList = seqList.slice(0, seqIndex)
    shuffle(preList)
    const postList =
      seqIndex === seqList.length - 1 ? [] : seqList.slice(seqIndex + 1)
    shuffle(postList)
    seqList = [...preList, seqList[seqIndex], ...postList]
  }

  // --- Navigation ---

  function next(isLoop: boolean): NavResult | null {
    if (mode === SeqMode.SINGLE_LOOP) return null
    if (seqList.length === 0) return null

    if (seqIndex + 1 >= seqList.length) {
      if (isLoop) {
        seqIndex = 0
        currentIndex = seqList[0]
        return { index: currentIndex, wrapped: true }
      }
      return null
    }

    seqIndex += 1
    currentIndex = seqList[seqIndex]
    return { index: currentIndex, wrapped: false }
  }

  function prev(isLoop: boolean): NavResult | null {
    if (mode === SeqMode.SINGLE_LOOP) return null
    if (seqList.length === 0) return null

    if (seqIndex - 1 < 0) {
      if (isLoop) {
        seqIndex = seqList.length - 1
        currentIndex = seqList[seqIndex]
        return { index: currentIndex, wrapped: true }
      }
      return null
    }

    seqIndex -= 1
    currentIndex = seqList[seqIndex]
    return { index: currentIndex, wrapped: false }
  }

  // --- Sequence Mode ---

  function cycleMode(): void {
    mode = ((mode + 1) % 3) as SeqMode
    if (seqList.length === 0) return

    switch (mode) {
      case SeqMode.LIST_ORDER:
        rebuildSeqList()
        seqIndex = seqList.indexOf(currentIndex)
        break
      case SeqMode.LIST_RND:
        shuffleFromCurrent()
        break
      // SINGLE_LOOP: no seqList change needed
    }
  }

  function setMode(newMode: SeqMode): void {
    if (newMode === mode) return
    mode = newMode
    if (seqList.length === 0) return

    switch (mode) {
      case SeqMode.LIST_ORDER:
        rebuildSeqList()
        seqIndex = seqList.indexOf(currentIndex)
        break
      case SeqMode.LIST_RND:
        shuffleFromCurrent()
        break
    }
  }

  // --- Playlist Mutation ---

  function initSeq(): void {
    rebuildSeqList()
    if (seqList.length !== 0) {
      seqIndex = seqList.indexOf(currentIndex)
      if (seqIndex === -1) seqIndex = 0
    }
  }

  function setTracks(newTracks: Track[], newCurrentIndex: number): void {
    tracks = newTracks
    currentIndex = newCurrentIndex
  }

  function handleChange(changeMode: PlayChangeMode): void {
    if (changeMode === PlayChangeMode.DONOTHING) return

    if (seqList.length === 0) {
      initSeq()
    }

    switch (changeMode) {
      case PlayChangeMode.ADD_CUR:
        // Add before current, play immediately
        seqList = seqList.map((seq) => (seq >= currentIndex ? seq + 1 : seq))
        seqList.splice(seqIndex, 0, currentIndex)
        break

      case PlayChangeMode.ADD_NEXT:
        // Add after current
        seqList = seqList.map((seq) => (seq > currentIndex ? seq + 1 : seq))
        seqList.splice(seqIndex + 1, 0, currentIndex + 1)
        break

      case PlayChangeMode.ADD_LAST:
        seqList.push(tracks.length - 1)
        break

      case PlayChangeMode.REPLACE_LIST:
        rebuildSeqList()
        seqIndex = 0
        break

      case PlayChangeMode.REPLACE_LIST_RND:
        mode = SeqMode.LIST_RND
        rebuildSeqList()
        shuffle(seqList)
        seqIndex = 0
        break

      case PlayChangeMode.ADD_LIST_LAST: {
        const extendList = Array.from(
          { length: tracks.length - seqList.length },
          (_, i) => seqList.length + i,
        )
        if (mode === SeqMode.LIST_RND) shuffle(extendList)
        seqList.push(...extendList)
        break
      }

      case PlayChangeMode.DIRECT_PLAY:
        seqIndex = seqList.indexOf(currentIndex)
        if (seqIndex === -1) seqIndex = 0
        break
    }
  }

  function removeTrack(removeIndex: number): { shouldPlayNext: boolean; nextIndex: number | null } {
    const seqIndexOfRemoved = seqList.indexOf(removeIndex)
    if (seqIndexOfRemoved !== -1) {
      seqList.splice(seqIndexOfRemoved, 1)
    }
    // Adjust all indices > removeIndex
    seqList = seqList.map((idx) => (idx > removeIndex ? idx - 1 : idx))

    const shouldPlayNext = currentIndex === removeIndex
    let nextIndex: number | null = null

    if (shouldPlayNext) {
      // Current track was removed — play whatever is at the same seqIndex (or wrap)
      if (seqList.length === 0) {
        nextIndex = null
      } else if (seqIndexOfRemoved >= seqList.length) {
        seqIndex = 0
      } else {
        seqIndex = seqIndexOfRemoved
      }
      nextIndex = seqList.length > 0 ? seqList[seqIndex] : null
      if (nextIndex !== null) currentIndex = nextIndex
    } else if (currentIndex > removeIndex) {
      currentIndex -= 1
    }

    return { shouldPlayNext, nextIndex }
  }

  function jumpTo(index: number): void {
    currentIndex = index
    seqIndex = seqList.indexOf(index)
    if (seqIndex === -1) seqIndex = 0
  }

  // --- Queries ---

  function getCurrentTrackId(): number | null {
    if (tracks.length === 0 || currentIndex < 0 || currentIndex >= tracks.length) return null
    return tracks[currentIndex]?.id ?? null
  }

  function getNextTrackId(isLoop: boolean): number | null {
    if (mode === SeqMode.SINGLE_LOOP) return null
    if (seqList.length === 0) return null

    let nextSeqIdx: number
    if (seqIndex + 1 >= seqList.length) {
      if (isLoop) nextSeqIdx = 0
      else return null
    } else {
      nextSeqIdx = seqIndex + 1
    }

    const nextPlaylistIndex = seqList[nextSeqIdx]
    if (nextPlaylistIndex === undefined) return null
    return tracks[nextPlaylistIndex]?.id ?? null
  }

  function getPrevTrackId(isLoop: boolean): number | null {
    if (mode === SeqMode.SINGLE_LOOP) return null
    if (seqList.length === 0) return null

    let prevSeqIdx: number
    if (seqIndex - 1 < 0) {
      if (isLoop) prevSeqIdx = seqList.length - 1
      else return null
    } else {
      prevSeqIdx = seqIndex - 1
    }

    const prevPlaylistIndex = seqList[prevSeqIdx]
    if (prevPlaylistIndex === undefined) return null
    return tracks[prevPlaylistIndex]?.id ?? null
  }

  return {
    get tracks() { return tracks },
    get currentIndex() { return currentIndex },
    get seqList() { return seqList },
    get seqIndex() { return seqIndex },
    get mode() { return mode },

    next,
    prev,
    cycleMode,
    setMode,
    initSeq,
    handleChange,
    setTracks,
    removeTrack,
    jumpTo,

    getCurrentTrackId,
    getNextTrackId,
    getPrevTrackId,
  }
}
