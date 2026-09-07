export const appInfo = {
  VUE_APP_NAME: 'WMusicPlayer',
  VUE_APP_VERSION: '1.0.0'
}

declare const __SW_VERSION__: string
export const SW_VERSION = typeof __SW_VERSION__ !== 'undefined' ? __SW_VERSION__ : 'dev'
