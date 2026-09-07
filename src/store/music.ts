import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import { loadLocaleMessages } from "@/i18n";

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
  
  /* Player params */
  const params = ref<PlayerOptions>({
    stat_percent: 30,
    switch_time: 500,
    max_fail_count: 10,
    isLoop: true,
    isAutoPlayNext: true,
    timeUpdateInterval: 500,
    transferBatchSize: 500,
  })
  function getParam<K extends keyof PlayerOptions>(key:K):PlayerOptions[K]{
    return params.value[key]
  }
  function setParam<K extends keyof PlayerOptions>(key:K, value:PlayerOptions[K]):void{
    params.value[key] = value
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