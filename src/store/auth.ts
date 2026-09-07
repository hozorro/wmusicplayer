import { ref, computed } from "vue";
import { defineStore } from "pinia";
import router from "@/router";
import { login as loginApi, logout as logoutApi, refreshToken as refreshApi } from "@/apis/methods/music";
import { TokenStorage } from "@/utilies/auth";
import type { ApiError } from "@/errors/apiError";
import { translateApiError, translateFieldErrors } from "@/i18n/translate";

export const useAuthStore = defineStore("auth", () => {
  const accessToken = ref<string>(TokenStorage.getAccessToken() || '')
  const refreshToken = ref<string>(TokenStorage.getRefreshToken() || '')
  const isLogining = ref(false)
  const loginErrors = ref<Record<string, any> | null>({})
  const _redirecting = ref(false) // 内部锁，防止并发401重复触发

  const isAuthenticated = computed(() => !!accessToken.value)
  const appType = computed(() => import.meta.env.VITE_CLIENT_TYPE)

  async function login(username: string, password: string) {
    isLogining.value = true
    loginErrors.value = null
    try {
      const { access_token, refresh_token } = await loginApi(username, password).send()

      TokenStorage.setAccessToken(access_token)
      TokenStorage.setRefreshToken(refresh_token)
      accessToken.value = access_token
      refreshToken.value = refresh_token

      return true
    } catch (rawError) {
      const error = rawError as ApiError
      if (error.code === 20001) {
        loginErrors.value = {
          form: translateApiError(error)
        }
      } else if (error.fields) {
        loginErrors.value = {
          fields: translateFieldErrors(error.fields)
        }
      } else {
        loginErrors.value = {
          form: translateApiError(error)
        }
      }
      return false
    } finally {
      isLogining.value = false
    }
  }

  async function logout() {
    clear()
    logoutApi().catch(() => {})
  }

  async function refresh() {
    if (!refreshToken.value) return false
    try {
      const { access_token, refresh_token } = await refreshApi(refreshToken.value)

      TokenStorage.setAccessToken(access_token)
      TokenStorage.setRefreshToken(refresh_token)
      accessToken.value = access_token
      refreshToken.value = refresh_token

      return true
    } catch (error: any) {
      TokenStorage.clear()
      return false
    }
  }

  function clear() {
    TokenStorage.clear()
    accessToken.value = ''
    refreshToken.value = ''
  }

  async function redirectToLogin(options?: {
    redirect?: string
    playing?: boolean
  }): Promise<void> {
    if (_redirecting.value) return
    _redirecting.value = true
    
    try {
      await logout()
      const currentPath = router.currentRoute.value.fullPath
      const redirect = options?.redirect
        ?? (currentPath !== '/' && currentPath !== '/login' ? currentPath : undefined)
      if (options?.playing) {
        // 当正在播放时，弹出登录面板，不打断播放
        // 此处仅派发事件，由App.vue或Layout组件监听处理，当前暂未处理
        window.dispatchEvent(new CustomEvent('login-required', { detail: { redirect } }))
      } else {
        await router.replace({
          path: '/login',
          query: redirect ? { redirect } : {}
        })
      }
    } finally {
      // 延迟重置锁，防止多个401连续触发
      setTimeout(() => {
        _redirecting.value = false
      }, 1000)
    }
  }
  
  return { 
    accessToken, 
    refreshToken, 
    isLogining, 
    loginErrors,
    isAuthenticated, 
    appType, 
    login, 
    logout, 
    refresh, 
    clear, 
    redirectToLogin 
  }
})