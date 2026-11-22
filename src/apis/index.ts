import { axiosRequestAdapter } from "@alova/adapter-axios";
import { createAlova } from "alova";
import type { AxiosError } from "axios";
import { createClientTokenAuthentication } from "alova/client";
import VueHook from "alova/vue";
import { refreshSession } from "./auth-session";
import { isTokenExpired, TokenStorage } from "@/utilies/auth";
import { generateTraceId } from "@/utilies/general";
import { ApiError } from "@/errors/apiError";
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
    if (token) method.config.headers.Authorization = `Bearer ${token}`
  },
  refreshToken: {
    isExpired: () => {
      // 无 refresh token 时不再尝试刷新；登录页冷启动的预载请求最多得到一次静默 401
      if (!TokenStorage.getRefreshToken()) return false
      const token = TokenStorage.getAccessToken()
      return !token || isTokenExpired(token)
    },
    // 单一刷新入口：失败不抛错，让原请求继续（网络错误由全局错误处理提示，
    // 凭证失效由 refreshSession 统一清空登录态），避免 beforeRequest 抛错绕过 onError
    handler: async () => {
      await refreshSession()
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
    onSuccess: async (response: any, method?: any) => {
      const resData = await response.data
      if (resData.code !== 200) {
        // 业务码非 200 必须抛错，否则刷新流程会拿到 undefined 并误判为凭证失效
        const error = new ApiError({
          code: resData.code,
          httpStatus: resData.httpStatus,
          display: method?.meta?.errorDisplay ?? 'toast',
        })
        handleGlobalApiError(error, method)
        throw error
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