import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import router from '@/router'
import App from './App.vue'

const app = createApp(App)
app.directive('default-src', (el: HTMLImageElement, binding) => {
  const defaultSrc = binding.value
  el.onerror =  () => {
    el.src = defaultSrc
    el.onerror = null
  }
})

app.use(router)
.use(createPinia())
.mount('#app')
