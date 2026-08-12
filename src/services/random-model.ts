import { t } from "@/utilies/use-i18n";

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
// name/description 用 getter 惰性求值：模块级直接调用 t() 会把文案冻结在首次导入时的语言
export const RANDOM_MODES: RandomMode[] = [
  { 
    key: 'pure',  
    get name() { return t('random.random') }, 
    get description() { return t('random.random_tip') },  
    icon: 'pure' 
  }, { 
    key: 'artist-r', 
    get name() { return t('random.artist') }, 
    get description() { return t('random.artist_tip') },
    icon: 'artist-r' 
  },{ 
    key: 'heat',   
    get name() { return t('random.familiar') }, 
    get description() { return t('random.familiar_tip') },
    icon: 'heat',
    param: { min: 2, max: 9, step: 1, defaultValue: 2, format: v => `${v}` } 
  }, { 
    key: 'artist-c',  
    get name() { return t('random.constraint') }, 
    get description() { return t('random.constraint_tip') },
    icon: 'artist-c',
    param: { min: 2, max: 9, step: 1, defaultValue: 2, format: v => `${v}` } 
  }, { 
    key: 'artist-w',    
    get name() { return t('random.weighted') },
    get description() { return t('random.weighted_tip') }, 
    icon: 'artist-w',
    param: { min: 2, max: 9, step: 1, defaultValue: 2, format: v => `${v}` } 
  },
]

export const paramlessModes = RANDOM_MODES.filter(m => !m.param)
export const paramModes = RANDOM_MODES.filter(m => m.param)