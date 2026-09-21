import type { MenuContext } from "./context";
import type { MenuKind, MenuSource } from "./types";
import { t } from "@/utilies/use-i18n";

export interface MenuAction {
  key: string
  label: string
  icon: string
  /** 危险操作：红色呈现 */
  danger?: boolean
  /** 待接入：禁用 + 便签 */
  placeholder?: boolean
  /** 需异步解析曲目：Host 侧单飞 + loading */
  resolves?: boolean
  /** 执行后面板保持打开（子流程入口专用） */
  keepsOpen?: boolean
  run: (source: MenuSource, ctx: MenuContext) => void | Promise<void>
}

type TrackSrc = Extract<MenuSource, { kind: 'track' }>
type QueueSrc = Extract<MenuSource, { kind: 'queue-track'}>

// label 用 getter 惰性求值：模块级直接调用 t() 会把文案冻结在首次导入时的语言
const trackActions: MenuAction[] = [
  { key: 'play', get label() { return t('player.play') }, icon: 'play',
    run: (s, ctx) => ctx.player.playTrack((s as TrackSrc).track) },
  { key: 'play-next', get label() { return t('player.add_next') }, icon: 'play-next',
    run: (s, ctx) => ctx.player.playNext((s as TrackSrc).track) },
  { key: 'add-play', get label() { return t('player.add_and_play') }, icon: 'add-play',
    run: (s, ctx) => ctx.player.addAndPlay([(s as TrackSrc).track]) },
  { key: 'add-queue', get label() { return t('player.add_to_queue') }, icon: 'queue',
    run: (s, ctx) => { ctx.playQueue.add((s as TrackSrc).track) } },
  { key: 'add-playlist', get label() { return t('player.add_to_playlist') }, icon: 'playlist', keepsOpen: true,
    run: (_s, ctx) => ctx.openPanel('playlist-picker') },
  { key: 'view-album', get label() { return t('player.to_album') }, icon: 'album', 
    run: (s, ctx) => {ctx.player.goToAlbum((s as TrackSrc).track)} },
]

const queueTrackActions: MenuAction[] = [
  { key: 'pin-top', get label() { return t('player.pin_top') }, icon: 'pin-top',
    run: (s, ctx) => ctx.playQueue.move((s as QueueSrc).index, 0) },
  { key: 'play-next', get label() { return t('player.move_to_next') }, icon: 'play-next',
    run: (s, ctx) => { ctx.playQueue.insertNext((s as QueueSrc).track) } },
  { key: 'add-playlist', get label() { return t('player.add_to_playlist') }, icon: 'playlist', keepsOpen: true,
    run: (_s, ctx) => ctx.openPanel('playlist-picker') },
  { key: 'view-album', get label() { return t('player.to_album') }, icon: 'album', 
    run: (s, ctx) => {ctx.player.goToAlbum((s as QueueSrc).track)} },
  { key: 'remove', get label() { return t('player.remove') }, icon: 'remove', danger: true,
    run: (s, ctx) => ctx.playQueue.removeAt((s as QueueSrc).index) },
]

const playlistActions: MenuAction[] = [
  ...trackActions.filter(a => a.key !== 'add-playlist'),
  { key: 'remove-from-playlist', get label() { return t('playlist.remove') }, icon: 'remove', danger: true,
    run: s => (s as Extract<MenuSource, { kind: 'playlist-track' }>).onRemove() }
]

/** 五类合集共享同一动作表：差异只在 resolveTracks 的接线方 */
const collectionActions: MenuAction[] = [
  { key: 'play-all', get label() { return t('player.playall') }, icon: 'play', resolves: true,
    run: async (s, ctx) => ctx.player.playAll(await ctx.resolveTracks(s)) },
  { key: 'play-next-all', get label() { return t('player.add_next') }, icon: 'play-next', resolves: true,
    run: async (s, ctx) => ctx.player.playNextAll(await ctx.resolveTracks(s)) },
  { key: 'add-play-all', get label() { return t('player.add_and_play') }, icon: 'add-play', resolves: true,
    run: async (s, ctx) => ctx.player.addAndPlay(await ctx.resolveTracks(s)) },
  { key: 'add-queue-all', get label() { return t('player.add_to_queue') }, icon: 'queue', resolves: true,
    run: async (s, ctx) => { ctx.playQueue.addMany(await ctx.resolveTracks(s)) } },
  // 合集 -> 歌单需批量接口 addTracksToPlaylist(playlistId, tracksIds[])，接线前置回占位
  { key: 'add-playlist', get label() { return t('player.add_to_playlist') }, icon: 'playlist', placeholder: true,
    run: () => {} },
]

export const MENU_ACTIONS: Record<MenuKind, MenuAction[]> = {
  track: trackActions,
  'queue-track': queueTrackActions,
  'playlist-track': playlistActions,
  album: collectionActions,
  artist: collectionActions,
  genre: collectionActions,
  folder: collectionActions,
  playlist: collectionActions,
}

export const KIND_LABEL: Record<MenuKind, string> = {
  get track() { return t('player.track') },
  get 'queue-track'() { return t('player.queue_track') },
  get 'playlist-track'() { return t('player.playlist_track') },
  get album() { return t('player.album') },
  get artist() { return t('player.artist') },
  get genre() { return t('player.genre') },
  get folder() { return t('player.folder') },
  get playlist() { return t('player.playlist') },
}