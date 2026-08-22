declare interface Operation {
  label: string,
  icon?: string,
  action: () => void
}
declare type SupportedLocale = 'en-US' | 'zh-CN' | 'ja-JP' | 'ko-KR'
declare interface PlayerOptions {
  stat_percent: number,
  switch_time: number,
  max_fail_count: number,
  isLoop: boolean,
  isAutoPlayNext: boolean,
  timeUpdateInterval: number,
  transferBatchSize: number,
}
declare type AppTheme = 'light' | 'dark' | 'system'
