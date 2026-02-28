import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedState from 'pinia-plugin-persistedstate'
import './style.css'
import router from '@/router'
import App from './App.vue'
import i18n, { loadLocaleMessages} from '@/i18n'
import { useMusicStore } from '@/store/music'

const app = createApp(App)

app.directive('default-src', (el: HTMLImageElement, binding) => {
  const defaultSrc = binding.value
  el.onerror =  () => {
    el.crossOrigin = 'anonymous'
    el.src = defaultSrc
    el.onerror = null
  }
})

const pinia = createPinia()
pinia.use(piniaPluginPersistedState)

app.use(router).use(pinia).use(i18n)

;(async () => {
  const musicStore = useMusicStore()
  await loadLocaleMessages(musicStore.locale)

  document.documentElement.className = musicStore.isDark ? "dark" : "light"

  app.mount('#app')
})()
