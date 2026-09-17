/**
 * 播放器域的曲目实体——曲库实体在播放域的投影。
 * 页面（artist/album/genre/folder）负责将曲库实体映射为Track，
 * 映射完成即快过限界上下文边界，播放域不感知曲库结构。
 */
export interface PlayTrack {
  /** 全局唯一。队列去重、同曲守卫、流地址缓存均以此键为准，MediaSession判重的统一契约 */
  id: number
  title: string
  artists?: ArtistBase[]
  album?: AlbumBase
  /** 秒，入库元数据可能确实或错误，运行时由durationchange回填 */
  duration?: number
  /** 音乐图片地址，经SW缓存层拦截 */
  cover_art_hash?: string
  cover?: string
}

/** 顺序 / 乱序 / 单曲循环 */
export type PlayMode = 'sequential' | 'shuffle' | 'loop-one'

/** 期望态，用户意图。与实际态分离——双态模型是调和器的基础 */
export type PlayIntent = 'play' | 'pause'

/**
 * 实际态：只接受引擎回写（写门见store action）
 * idle=无曲目/loading=载入中/buffering=缓冲/playing/paused/error
 */
export type EngineState = 'idle' | 'loading' | 'buffering' | 'playing' | 'paused' | 'error'

/** 用户意图契约：facade实现，MediaSession 等外部指令面消费 */
export interface PlayerIntents {
  play(): void
  pause(): void
  toggle(): void
  next(): void
  prev(): void
  playAt(TrackIndex: number): void
  playTrack(t: PlayTrack): void
  addAndPlay(tracks: PlayTrack[]): void
  playAll(tracks: PlayTrack[], at?: number): void
  playNext(t: PlayTrack): void
  playNextAll(tracks: PlayTrack[]): void
  seek(t: number): void
  setVolume(v: number): void
}