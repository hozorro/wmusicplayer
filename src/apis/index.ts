import { axiosRequestAdapter } from "@alova/adapter-axios";
import { createAlova } from "alova";
import type { AxiosError } from "axios";
import { createClientTokenAuthentication } from "alova/client";
import VueHook from "alova/vue";
import { refreshToken } from "./methods/music";
import { toast } from "@/services/toast";
import { isTokenExpired, TokenStorage } from "@/utilies/auth";
import { generateTraceId } from "@/utilies/general";
import { t } from '@/utilies/use-i18n'
import { normalizeError } from "@/errors/normalizeError";
import { handleGlobalApiError } from "@/errors/handlers";

const alvoaStorageAdapter = () => {
  const prefix = 'alova_cache_'
  return {
    set: (key: string, value: any) => {
      localStorage.setItem(prefix + key, JSON.stringify(value))
    },
    get: (key: string) => {
      const data = localStorage.getItem(prefix + key)
      return data ? JSON.stringify(data) : data
    },
    remove: (key: string) => {
      localStorage.removeItem(prefix + key)
    },
    clear: () => {
      Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k))
    }
  }
}

const { onAuthRequired, onResponseRefreshToken } = createClientTokenAuthentication<typeof VueHook, typeof axiosRequestAdapter>({
  assignToken: (method) => {
    const token = TokenStorage.getAccessToken()
    method.config.headers.Authorization = `Bearer ${token}`
  },
  refreshToken: {
    isExpired: () => {
      const token = TokenStorage.getAccessToken()
      if (!token) return true
      return isTokenExpired(token)
    },
    handler: async () => {
      try {
        const do_refresh_token = TokenStorage.getRefreshToken()
        if (!do_refresh_token) throw new Error('refresh_token not found')
        const { access_token, refresh_token } = await refreshToken(do_refresh_token)
        TokenStorage.setAccessToken(access_token)
        TokenStorage.setRefreshToken(refresh_token)
      } catch (error) {
        TokenStorage.clear()
        location.href = '/login'
        throw error
      }
    },
  },
  async login(response) {
    const { access_token, refresh_token } = await response.data.data
    TokenStorage.setAccessToken(access_token)
    TokenStorage.setRefreshToken(refresh_token)
  }
});

export const generalAlova = createAlova({
  baseURL: "/api/",
  statesHook: VueHook,
  requestAdapter: axiosRequestAdapter(),
  l2Cache: alvoaStorageAdapter(),
  cacheFor: { GET: 1000 * 60 * 5, POST: 0 },
  timeout: 1000 * 60 * 2,
  beforeRequest: onAuthRequired(method => {
    method.config.headers['X-Client-Type'] = import.meta.env.VITE_CLIENT_TYPE || 'player'
    method.config.headers['X-Device-ID'] = TokenStorage.getDeviceId()
    const traceId = generateTraceId()
    method.config.headers['X-Request-ID'] = traceId

    // 同时存入meta，方便错误上报时读取
    method.meta = { ...method.meta, traceId }
  }),
  responded: onResponseRefreshToken({
    onSuccess: async (response) => {
      const resData = await response.data
      console.log(resData)
      if(resData.code !== 200){
        toast(`${t('errors.data_error')}[${resData.code}]: ${resData.msg}`, "error")
        return
      }
      return resData.data
    },
    onError: (rawError: AxiosError, method) => {
      const error = normalizeError(rawError, method)
      handleGlobalApiError(error, method)
      throw error
    }
  })
});