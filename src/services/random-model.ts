export interface RandomModeParam {
  min: number
  max: number
  step: number
  defaultValue: number
  format: (v: number) => string
}

export type RandomModeKey = 'pure' | 'artist-r' | 'heat' | 'artist-c' | 'artist-w'

export interface RandomMode {
  key: RandomModeKey            // getRandomTracks 的 mode 参数
  name: string
  description: string
  icon: string           // 图标名 → RandomView 图标表（P7.6.3）
  /** 缺省 = 零参数：首页直达 + Random 页点按即播 */
  param?: RandomModeParam
}

/** 六种模式按后端实际机制填充 key / name / 权重区间 */
export const RANDOM_MODES: RandomMode[] = [
  { 
    key: 'pure',  
    name: '随机播放', 
    description: '随机选取50首歌',  
    icon: 'shuffle' 
  }, { 
    key: 'artist-r', 
    name: '歌手随机', 
    description: '随机选出50位歌手，每位歌手随机1首歌',
    icon: 'artist' 
  },{ 
    key: 'heat',   
    name: '熟歌模式', 
    description: '加权随机选出50首歌，优先度越高，越偏向播放过的， 优先度：',
    icon: 'heat',
    param: { min: 2, max: 9, step: 1, defaultValue: 2, format: v => `${v}` } 
  }, { 
    key: 'artist-c',  
    name: '约束加权', 
    description: '随机选出50首歌，但每位歌手的歌曲数量不超过：',
    icon: 'constraint',
    param: { min: 2, max: 9, step: 1, defaultValue: 2, format: v => `${v}` } 
  }, { 
    key: 'artist-w',    
    name: '加权随机',
    description: '加权随机选出50位歌手，每位歌手1首歌，权重度越高，越偏向于歌曲数量多的歌手，权重度：', 
    icon: 'weighted',
    param: { min: 2, max: 9, step: 1, defaultValue: 2, format: v => `${v}` } 
  },
]

export const paramlessModes = RANDOM_MODES.filter(m => !m.param)
export const paramModes = RANDOM_MODES.filter(m => m.param)