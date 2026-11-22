import { ref, computed } from "vue";
import { defineStore } from "pinia";
import router from "@/router";
import { login as loginApi, logout as logoutApi } from "@/apis/methods/music";
import { TokenStorage } from "@/utilies/auth";
import { clearSession, onAuthInvalidated, refreshSession } from "@/apis/auth-session";
import type { ApiError } from "@/errors/apiError";
import { translateApiError, translateFieldErrors } from "@/i18n/translate";

export const useAuthStore = defineStore("auth", () => {
  const accessToken = ref<string>(TokenStorage.getAccessToken() || '')
  const refreshToken = ref<string>(TokenStorage.getRefreshToken() || '')
  const isLogining = ref(false)
  const loginErrors = ref<Record<string, any> | null>({})
  const _redirecting = ref(false) // 内部锁，防止并发401重复触发

  // auth-session 是登录态唯一真源：凭证失效时同步清空本 store 的内存状态
  onAuthInvalidated(() => {
    accessToken.value = ''
    refreshToken.value = ''
  })

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
    // 主动登出：趁 access token 还在，先通知服务端撤销 refresh token
    if (TokenStorage.getAccessToken()) {
      try {
        await logoutApi()
      } catch {
        // 服务端登出失败不阻塞本地登出
      }
    }
    clear()
  }

  async function refresh() {
    const ok = await refreshSession()
    if (ok) {
      accessToken.value = TokenStorage.getAccessToken() || ''
      refreshToken.value = TokenStorage.getRefreshToken() || ''
    }
    return ok
  }

  function clear() {
    clearSession()
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
      // 401 表示服务端已拒绝凭证：只做本地登出，不再发 logout 请求触发二次刷新
      clear()
      const { path, fullPath } = router.currentRoute.value
      const redirect = options?.redirect
        ?? (path !== '/' && path !== '/login' ? fullPath : undefined)
      if (options?.playing) {
        // 当正在播放时，弹出登录面板，不打断播放
        // 此处仅派发事件，由App.vue或Layout组件监听处理，当前暂未处理
        window.dispatchEvent(new CustomEvent('login-required', { detail: { redirect } }))
      } else if (path !== '/login') {
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