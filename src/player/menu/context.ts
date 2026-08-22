import type { usePlayer } from '@/composables/playback'
import type { usePlayerQueue } from '@/composables/player-queue'
import type { MenuSource } from './types'
import type { PlayTrack } from '@/player/types'

export interface MenuContext {
  player: ReturnType<typeof usePlayer>
  playQueue: ReturnType<typeof usePlayerQueue>
  resolveTracks: (s: MenuSource) => Promise<PlayTrack[]>
  openPanel: (panel: 'playlist-picker') => void
}
