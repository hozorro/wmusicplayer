import type { MenuContext } from "./context";
import type { MenuKind, MenuSource } from "./types";

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

const trackActions: MenuAction[] = [
  { key: 'play', label: '播放', icon: 'play',
    run: (s, ctx) => ctx.player.playTrack((s as TrackSrc).track) },
  { key: 'play-next', label: '下一首播放', icon: 'play-next',
    run: (s, ctx) => ctx.player.playNext((s as TrackSrc).track) },
  { key: 'add-play', label: '添加并播放', icon: 'add-play',
    run: (s, ctx) => ctx.player.addAndPlay([(s as TrackSrc).track]) },
  { key: 'add-queue', label: '添加到队列', icon: 'queue',
    run: (s, ctx) => { ctx.playQueue.add((s as TrackSrc).track) } },
  { key: 'add-playlist', label: '添加到歌单', icon: 'playlist', keepsOpen: true,
    run: (_s, ctx) => ctx.openPanel('playlist-picker') },
  { key: 'view-album', label: '查看所属专辑', icon: 'album', placeholder: true,
    run: () => {} },
]

const queueTrackActions: MenuAction[] = [
  { key: 'pin-top', label: '置顶', icon: 'pin-top',
    run: (s, ctx) => ctx.playQueue.move((s as QueueSrc).index, 0) },
  { key: 'play-next', label: '移到下一曲', icon: 'play-next',
    run: (s, ctx) => { ctx.playQueue.insertNext((s as QueueSrc).track) } },
  { key: 'add-playlist', label: '添加到歌单', icon: 'playlist', keepsOpen: true,
    run: (_s, ctx) => ctx.openPanel('playlist-picker') },
  { key: 'view-album', label: '查看所属专辑', icon: 'album', placeholder: true,
    run: () => {} },
  { key: 'remove', label: '从队列删除', icon: 'remove', danger: true,
    run: (s, ctx) => ctx.playQueue.removeAt((s as QueueSrc).index) },
]

const playlistActions: MenuAction[] = [
  ...trackActions.filter(a => !['add-playlist', 'view-album'].includes(a.key)),
  { key: 'remove-from-playlist', label: '从歌单移除', icon: 'remove', danger: true,
    run: s => (s as Extract<MenuSource, { kind: 'playlist-track' }>).onRemove() },
  { key: 'view-album', label: '查看所属专辑', icon: 'album', placeholder: true, run: () => {}}
]

/** 五类合集共享同一动作表：差异只在 resolveTracks 的接线方 */
const collectionActions: MenuAction[] = [
  { key: 'play-all', label: '播放全部', icon: 'play', resolves: true,
    run: async (s, ctx) => ctx.player.playAll(await ctx.resolveTracks(s)) },
  { key: 'play-next-all', label: '下一首播放', icon: 'play-next', resolves: true,
    run: async (s, ctx) => ctx.player.playNextAll(await ctx.resolveTracks(s)) },
  { key: 'add-play-all', label: '添加并播放', icon: 'add-play', resolves: true,
    run: async (s, ctx) => ctx.player.addAndPlay(await ctx.resolveTracks(s)) },
  { key: 'add-queue-all', label: '添加到队列', icon: 'queue', resolves: true,
    run: async (s, ctx) => { ctx.playQueue.addMany(await ctx.resolveTracks(s)) } },
  // 合集 -> 歌单需批量接口 addTracksToPlaylist(playlistId, tracksIds[])，接线前置回占位
  { key: 'add-playlist', label: '添加到歌单', icon: 'playlist', placeholder: true,
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
  track: '歌曲', 'queue-track': '队列曲目', 'playlist-track': '歌单曲目',
  album: '专辑', artist: '艺人', genre: '流派', folder: '文件夹', playlist: '歌单',
}