/**
 * 播放器可调参数配置
 * 纯数据模块，零依赖，可单测
 * 所有魔法数字集中管理，支持运行时覆盖
 */

export interface PlayerConfig {
  // ——播放控制 ——
  /** 连续失败熔断阈值 */
  MAX_CONSECUTIVE_FAILURES: number
  /** 自动循环 */
  AUTOLOOP: boolean
  
  // ——播放统计 ——
  /** 播放计次阈值：播放进度百分比(0-100) */
  STAT_PERCENT: number
  /** 播放计次时间上限（秒）：长曲目不拖长计时 */
  HIT_MAX_SECONDS: number
  /** 重播判定窗口（秒）：回到该窗口内视为新一次播放 */
  RESTART_WINDOW: number

  // ——预加载 ——
  /** URL 层预热数量：轻量，覆盖未来 N 首 */
  URL_AHEAD: number
  /** 字节层预热数量：中量，覆盖未来 N 首 */
  BYTES_AHEAD: number
  /** 期中重解析节拍（毫秒）*/
  REFRESH_TICK_MS: number
  /** 预热延迟（毫秒）：让当前曲目载链路独享带宽 */
  PRELOAD_DELAY_MS: number
  /** 加载中顺延节拍（毫秒）*/
  LOADING_RETRY_MS: number
  /** 加载超时（毫秒）：loadeddata 永不触发时拒绝 */
  LOAD_TIMEOUT_MS: number

  // ——缓存 ——
  /** 本地字节缓存上限：插入序 LRU，防配额击穿 */
  MAX_CACHED_TRACKS: number

  // ——同步 ——
  /** 同步分页大小 */
  SYNC_PAGE_SIZE: number
  /** 同步分页重试次数 */
  SYNC_PAGE_ATTEMPTS: number
  /** 播放同步最大重试次数 */
  PLAYBACK_SYNC_MAX_ATTEMPTS: number
  /** 退避基础延时（毫秒）：指数退避的基数 */
  BACKOFF_BASE_MS: number
  /** 退避上限（毫秒）：防止无限增长 */
  BACKOFF_MAX_MS: number

  // ——IDB 查询 ——
  /** 随机曲目默认数量 */
  RANDOM_DEFAULT_NUM: number
  /** 散布取歌每位歌手默认数量 */
  SCATTER_M_DEFAULT: number
  /** 散布取歌总量默认 */
  SCATTER_N_DEFAULT: number
  /** 散布取歌每位歌手上限 */
  SCATTER_M_CAP: number
  /** 散布取歌总量上限 */
  SCATTER_N_CAP: number
  /** 热门歌手数量 */
  TOP_ARTISTS_COUNT: number
  /** 随机歌手数量 */
  RANDOM_ARTISTS_COUNT: number
  /** 歌手热门曲目数量 */
  TOP_TRACKS_COUNT: number
  /** 搜索结果每类上限 */
  SEARCH_TYPE_LIMIT: number
}

/** 默认值：与当前硬编码值保持一致 */
export const DEFAULT_CONFIG: PlayerConfig = {
  MAX_CONSECUTIVE_FAILURES: 3,
  AUTOLOOP: true,
  
  STAT_PERCENT: 30,
  HIT_MAX_SECONDS: 60,
  RESTART_WINDOW: 1.5,

  URL_AHEAD: 3,
  BYTES_AHEAD: 2,
  REFRESH_TICK_MS: 30000,
  PRELOAD_DELAY_MS: 3000,
  LOADING_RETRY_MS: 2000,
  LOAD_TIMEOUT_MS: 20000,

  MAX_CACHED_TRACKS: 10,

  SYNC_PAGE_SIZE: 500,
  SYNC_PAGE_ATTEMPTS: 3,
  PLAYBACK_SYNC_MAX_ATTEMPTS: 3,
  BACKOFF_BASE_MS: 1000,
  BACKOFF_MAX_MS: 10000,

  RANDOM_DEFAULT_NUM: 50,
  SCATTER_M_DEFAULT: 3,
  SCATTER_N_DEFAULT: 50,
  SCATTER_M_CAP: 20,
  SCATTER_N_CAP: 200,
  TOP_ARTISTS_COUNT: 6,
  RANDOM_ARTISTS_COUNT: 4,
  TOP_TRACKS_COUNT: 20,
  SEARCH_TYPE_LIMIT: 50,
}

/** 配置键名映射：用于持久化迁移 */
export const CONFIG_KEY_MAP: Record<string, keyof PlayerConfig> = {
  // 旧键名-> 新键名
  stat_percent: 'STAT_PERCENT',
  max_fail_count: 'MAX_CONSECUTIVE_FAILURES',
  isLoop: 'AUTOLOOP',
}
