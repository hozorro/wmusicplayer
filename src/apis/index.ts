import { axiosRequestAdapter } from "@alova/adapter-axios";
import { createAlova } from "alova";
import type { AxiosError } from "axios";
import { createClientTokenAuthentication } from "alova/client";
import VueHook from "alova/vue";
import { refreshToken } from "./methods/music";
import { toast } from "@/services/toast";
import { isTokenExpired } from "@/utilies/auth";
import { t } from '@/utilies/use-i18n'
import { TokenStorage } from "@/utilies/auth";

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
  cacheFor: { GET: 1000 * 60 * 5, POST: 0 },
  timeout: 1000 * 60 * 2,
  beforeRequest: onAuthRequired(method => {
    method.config.headers['X-Client-Type'] = import.meta.env.VITE_CLIENT_TYPE || 'player'
    method.config.headers['X-Device-ID'] = TokenStorage.getDeviceId()
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
    onError: (error: AxiosError) => {
      if (error.response) {
        switch (error.response.status) { 
          case 401: 
            toast(t('errors._401'), 'error')
            break;
          case 404:
            toast(t('errors._404'), 'error')
            break;
          case 500: 
            toast(t('errors._500'), 'error')
            break;
          default: 
            toast(`${t('errors.unknown')}[${error.response.status}]:${error.message}`, 'error')
        }
      } else if (error.request) {
        toast(`${t('errors.no_response')}:${error.request}`, 'error')
      } else {
        toast(`${t('errors.request_error')}:${error.message}`, 'error')
      }
    }
  })
});