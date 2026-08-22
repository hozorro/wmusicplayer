import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createPersistedState} from 'pinia-plugin-persistedstate'
import './style.css'
import router from '@/router'
import App from './App.vue'
import i18n, { loadLocaleMessages} from '@/i18n'
import { useMusicStore } from '@/store/music'
import { initPlayer } from '@/player/facade/index.ts'
import { initIdbState } from './services/idb-state.ts'


const app = createApp(App)

const pinia = createPinia()
pinia.use(createPersistedState())

app.use(router).use(pinia).use(i18n)

initPlayer()
void initIdbState()

// import { initSyncScheduler } from './services/lib-sync.ts'
// initSyncScheduler()

;(async () => {
  const musicStore = useMusicStore()

  await loadLocaleMessages(musicStore.locale)
  musicStore.initTheme()

  app.mount('#app')
})()
