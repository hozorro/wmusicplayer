declare interface Operation {
  label: string,
  icon?: string,
  action: () => void
}
declare type SupportedLocale = 'en-US' | 'zh-CN' | 'ja-JP' | 'ko-KR'
declare type AppTheme = 'light' | 'dark' | 'system'
