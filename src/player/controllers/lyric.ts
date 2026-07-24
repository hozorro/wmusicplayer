/**
 * Controller — Lyric
 *
 * Manages lyric loading, parsing, and current-line tracking.
 * Listens to track-changed for loading new lyrics.
 * Listens to engine timeupdate for updating the current lyric line.
 */

import { nextTick, type Ref } from 'vue'
import { getLyric } from '@/apis/methods/music'
import { LyricParser } from '@/utilies/lyric-parser'
import type { Engine } from '../audio-engine/interfaces'
import type { EngineEventBus } from '../audio-engine/events'
import type { PlayerEventBus } from '../events'
import type { PlayerState } from '../state'
import type { Controller } from '../types'

export interface LyricController extends Controller {
  /** Set the lyric container element ref (for scrolling) */
  setLyricContainerRef(ref: Ref<HTMLElement | null>): void
}

interface LyricControllerDeps {
  engine: Engine
  engineEvents: EngineEventBus
  playerEvents: PlayerEventBus
  state: PlayerState
}

export function createLyricController(deps: LyricControllerDeps): LyricController {
  const { engine, engineEvents, playerEvents, state } = deps

  let lyricContainerRef: Ref<HTMLElement | null> | null = null
  let disposed = false

  function init() {
    // Load lyrics when track changes
    playerEvents.on('track-changed', (e: any) => {
      if (disposed) return
      loadLyric(e.trackId as number)
    })

    // Update current lyric line on timeupdate
    engineEvents.on('timeupdate', (e) => {
      if (disposed) return
      const activeSlot = engine.getActiveSlot()
      if (!activeSlot || e.slotId !== activeSlot.id) return

      if (state.lyric.value) {
        const index = state.lyric.value.getCurrentLyricIndex((e as any).currentTime)
        if (index !== state.curLyricIndex) {
          state.curLyricIndex = index
          state.curLyric = index === -1 ? '' : state.lyrics.value[index]?.text || ''

          nextTick(() => {
            scrollToCurrent()
          })
        }
      }
    })
  }

  async function loadLyric(trackId: number): Promise<void> {
    state.lyricLoading = true
    state.lyricError = ''
    state.curLyricIndex = -1
    state.curLyric = ''
    state.lyricLineRefs.value = []

    try {
      const lyricContent = await getLyric(trackId)
      if (disposed) return

      if (lyricContent) {
        const parser = new LyricParser(lyricContent)
        state.lyric.value = parser
        state.lyrics.value = parser.getLyrics()
        state.metadata.value = parser.getMetadata()
      } else {
        state.lyricError = 'Failed to load lyric.'
      }
    } catch (err: any) {
      if (disposed) return
      state.lyricError = err?.message || 'Failed to load lyric.'
    } finally {
      state.lyricLoading = false
    }
  }

  function scrollToCurrent(): void {
    if (!lyricContainerRef?.value || state.curLyricIndex < 0) return

    const lineRefs = state.lyricLineRefs.value
    const targetLine = lineRefs[state.curLyricIndex]
    if (!targetLine) return

    const containerRect = lyricContainerRef.value.getBoundingClientRect()
    const lineRect = targetLine.getBoundingClientRect()

    const containerTop = containerRect.top
    const containerBottom = containerRect.bottom
    const lineTop = lineRect.top
    const lineBottom = lineRect.bottom

    if (lineTop < containerTop || lineBottom > (containerTop + containerBottom) / 2) {
      targetLine.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  function setLyricContainerRef(ref: Ref<HTMLElement | null>) {
    lyricContainerRef = ref
  }

  function dispose() {
    disposed = true
  }

  return {
    init,
    dispose,
    setLyricContainerRef,
  }
}
