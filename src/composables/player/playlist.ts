import { reactive, readonly } from "vue";
import type { PlayerTrack } from "./types";

export const PlaylistAction = {
  ADD_CUR: 'ADD_CUR',
  ADD_NEXT: 'ADD_NEXT',
  ADD_LAST: 'ADD_LAST',
  REPLACE_LIST: 'REPLACE_LIST',
  REPLACE_LIST_RND: 'REPLACE_LIST_RND',
  ADD_LIST_LAST: 'ADD_LIST_LAST',
  DIRECT_PLAY: 'DIRECT_PLAY',
  DONOTHING: 'DONOTHING',
} as const

export type PlaylistAction = (typeof PlaylistAction)[keyof typeof PlaylistAction]

export interface PlaylistState {
  tracks: PlayerTrack[]
  playOrder: number[]
  currentIndex: number
}

export interface PlaylistChangeResult {
  changed: boolean
  // add another property later
}

export function createPlaylist() {
  const state = reactive<PlaylistState>({
    tracks: [],
    playOrder: [],
    currentIndex: -1
  });

  function rebuildPlayOrder(): void {
    state.playOrder = state.tracks.map((_, index) => index)
  }

  function setTracks(tracks: PlayerTrack[]): void {
    state.tracks = [...tracks];
    rebuildPlayOrder();
    state.currentIndex = state.tracks.length > 0 ? 0 : -1
  }

  function resolveTrack(playIndex: number): PlayerTrack | null {
    if (playIndex < 0 || playIndex >= state.playOrder.length) return null
    const trackIndex = state.playOrder[playIndex]
    return state.tracks[trackIndex] ?? null
  }

  function hasNext(): boolean {
    return state.playOrder.length > 0
  }

  function hasPrevious(): boolean {
    return state.playOrder.length > 0
  }

  function clear(): void {
    state.tracks = [];
    state.playOrder = [];
    state.currentIndex = -1;
  }

  function current(): PlayerTrack | null {
    if (state.currentIndex < 0) return null

    const index = state.playOrder[state.currentIndex]
    return state.tracks[index] ?? null
  }

  function goto(index: number): PlayerTrack | null {
    if (index < 0 || index >= state.playOrder.length) return null
    state.currentIndex = index
    return current()
  }

  function peek(offset: number): PlayerTrack | null {
    if (state.playOrder.length === 0) return null
    const playIndex = (state.currentIndex + offset) % state.playOrder.length
    return resolveTrack(playIndex)
  }

  function peekNext(): PlayerTrack | null {
    return peek(1)
  }

  function peekPrevious(): PlayerTrack | null {
    return peek(-1)
  }

  function commitNext(): PlayerTrack | null {
    if (!hasNext()) return null
    state.currentIndex = (state.currentIndex + 1) % state.playOrder.length
    return current()
  }

  function commitPrevious(): PlayerTrack | null {
    if (!hasPrevious()) return null
    state.currentIndex = (state.currentIndex - 1 + state.playOrder.length) % state.playOrder.length
    return current()
  }

  function appendTracks(tracks: PlayerTrack[]): void {
    state.tracks.push(...tracks);
    rebuildPlayOrder()
    if (state.currentIndex < 0 && state.tracks.length > 0) {
      state.currentIndex = 0;
    }
  }

  function apply(action: PlaylistAction, payload: PlayerTrack | PlayerTrack[]): PlaylistChangeResult {
    switch(action) {
      case PlaylistAction.REPLACE_LIST: {
        const tracks = Array.isArray(payload) ? payload : [payload];
        setTracks(tracks);
        return { changed: true };
      }
      case PlaylistAction.ADD_LAST: {
        const tracks = Array.isArray(payload) ? payload : [payload];
        appendTracks(tracks)
        return { changed: tracks.length > 0 }
      }
      case PlaylistAction.ADD_LIST_LAST: {
        const tracks = Array.isArray(payload) ? payload : [payload];
        appendTracks(tracks)
        return { changed: tracks.length > 0 }
      }
      case PlaylistAction.DONOTHING:
      default:
        return { changed: false };
    }
  }

  return {
    state: readonly(state),
    setTracks,
    clear,
    current,
    goto,
    peekNext,
    peekPrevious,
    commitNext,
    commitPrevious,
    hasNext,
    hasPrevious,
    apply
  }
}