import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { login as loginApi, refreshToken as refreshApi } from "@/apis/methods/music";
import { TokenStorage } from "@/utilies/auth";

export const useAuthStore = defineStore("auth", () => {
  const accessToken = ref<string>(TokenStorage.getAccessToken() || '')
  const refreshToken = ref<string>(TokenStorage.getRefreshToken() || '')
  const isLogining = ref(false)

  const isAuthenticated = computed(() => !!accessToken.value)
  const appType = computed(() => import.meta.env.VITE_APP_TYPE)

  async function login(username: string, password: string) {
    isLogining.value = true
    try {
      const { access_token, refresh_token } = await loginApi(username, password)

      TokenStorage.setAccessToken(access_token)
      TokenStorage.setRefreshToken(refresh_token)
      accessToken.value = access_token
      refreshToken.value = refresh_token

      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || "Login failed" }
    } finally {
      isLogining.value = false
    }
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
  
  return { accessToken, refreshToken, isLogining, isAuthenticated, appType, login, refresh, clear }
})