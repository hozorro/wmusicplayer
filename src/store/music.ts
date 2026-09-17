import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import { loadLocaleMessages } from "@/i18n";
import { updateConfig } from "@/config/config-provider";
import { DEFAULT_CONFIG, CONFIG_KEY_MAP, type PlayerConfig } from "@/config/player-config";

const VALID_THEMES = ["light", "dark", "system"];

export const useMusicStore = defineStore("music", () => {
  /* Locale */
  const locale =  ref<SupportedLocale>((localStorage.getItem('locale') || 'zh-CN') as SupportedLocale)
  async function setLocale(newLocale: SupportedLocale) {
    if (locale.value === newLocale) return
    await loadLocaleMessages(newLocale)
    locale.value = newLocale
  }

  /* Theme */ 
  const theme = ref<AppTheme>('dark')
  const systemDark = ref(false)     // 内部状态，不 return，不会被持久化
  const isDark = computed(() => {   // 当前是否暗色
    return (theme.value ==='dark' || (theme.value === 'system' && systemDark.value))
  })
  let themeInitialized = false
  function applyThemeToDom() {
    if (typeof document === undefined) return
    document.body.classList.toggle('dark', isDark.value)
  }
  function setTheme(newTheme: AppTheme) {
    if (!VALID_THEMES.includes(newTheme)) return
    theme.value = newTheme
  }
  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark')
  }
  function initTheme() {
    if (typeof window === undefined) return
    if (themeInitialized) return
    themeInitialized = true
    // 如果持久化恢复出来的值非法，回退到 system
    if (!VALID_THEMES.includes(theme.value)) theme.value = 'dark'
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    systemDark.value = media.matches
    media.addEventListener('change', (e) => {
      systemDark.value = e.matches
    })
    // 主题变化时同步到 <html class="dark">
    watch(isDark, applyThemeToDom, { immediate: true })
  }

  /* App status */
  const artistPageTab = ref<'tracks' | 'albums'>('tracks')
  function setArtistPageTab(tab: 'tracks' | 'albums') {
    artistPageTab.value = tab
  }
  
  /* Player params - 持久化到 localStorage，同时同步到全局配置 */
  const params = ref<PlayerConfig>({ ...DEFAULT_CONFIG })
  
  // 迁移旧版本持久化数据（key 从 snake_case 改为 UPPER_SNAKE_CASE）
  migrateLegacyParams()
  function migrateLegacyParams() {
    const persisted = JSON.parse(localStorage.getItem('music') || '{}')?.params
    if (!persisted) return
    for (const [oldKey, newKey] of Object.entries(CONFIG_KEY_MAP)) {
      if (oldKey in persisted) {
        ;(params.value as Record<string, unknown>)[newKey] = persisted[oldKey]
      }
    }
  }
  
  // 初始化时同步到全局配置
  syncToGlobalConfig()
  function syncToGlobalConfig() {
    updateConfig({ ...params.value })
  }
  
  function getParam<K extends keyof PlayerConfig>(key:K):PlayerConfig[K]{
    return params.value[key]
  }
  function setParam<K extends keyof PlayerConfig>(key:K, value:PlayerConfig[K]):void{
    params.value[key] = value
    // 实时同步到全局配置
    updateConfig({ [key]: value } as Partial<PlayerConfig>)
  }
  
  return { 
    locale,
    theme,
    isDark,
    setTheme,
    toggleTheme,
    initTheme,
    artistPageTab,
    setArtistPageTab,
    params,
    setLocale,
    getParam,
    setParam
  }
}, {
  persist: {
    pick:['locale', 'theme', 'params']
  }
})

export type MusicStore = ReturnType<typeof useMusicStore>