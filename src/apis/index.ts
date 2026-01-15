import { axiosRequestAdapter } from "@alova/adapter-axios";
import { createAlova } from "alova";
import type { AxiosError } from "axios";
import { createClientTokenAuthentication } from "alova/client";
import VueHook from "alova/vue";
import { refreshToken } from "./methods/music";
import WMessage from "@/composables/message";
import { isTokenExpired } from "@/utilies/general";
import { t } from '@/utilies/use-i18n'

const { onAuthRequired, onResponseRefreshToken } = createClientTokenAuthentication<typeof VueHook, typeof axiosRequestAdapter>({
  assignToken: (method) => {
    if (method.meta?.authRole === 'refreshToken') { // ? after method.meta needed, or not error in IDE, but getCurrentUser() in router navigation will return undefined
      method.config.headers.Authorization = `Bearer ${localStorage.getItem('refresh_token')}`
    } else {
      method.config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`
    }
  },
  refreshToken: {
    isExpired: () => {
      const token = localStorage.getItem('token')
      if (!token) return true
      return isTokenExpired(token)
    },
    handler: async () => {
      try {
        const { access_token } = await refreshToken()
        localStorage.setItem('token', access_token)
      } catch (error) {
        location.href = '/login'
        throw error
      }
    },
  },
  async login(response) {
    const { access_token, refresh_token } = await response.data.data
    localStorage.setItem('token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
  }
});

export const generalAlova = createAlova({
  baseURL: "/api/",
  statesHook: VueHook,
  requestAdapter: axiosRequestAdapter(),
  cacheFor: { GET: 1000 * 60 * 5, POST: 0 },
  timeout: 1000 * 60 * 2,
  beforeRequest: onAuthRequired(),
  responded: onResponseRefreshToken({
    onSuccess: async (response) => {
      const resData = await response.data
      console.log(resData)
      if(resData.code !== 200){
        WMessage(`${t('errors.data_error')}[${resData.code}]: ${resData.msg}`, "error")
        return
      }
      return resData.data
    },
    onError: (error: AxiosError) => {
      if (error.response) {
        switch (error.response.status) { 
          case 401: 
            WMessage(t('errors._401'), 'error')
            break;
          case 404:
            WMessage(t('errors._404'), 'error')
            break;
          case 500: 
            WMessage(t('errors._500'), 'error')
            break;
          default: 
            WMessage(`${t('errors.unknown')}[${error.response.status}]:${error.message}`, 'error')
        }
      } else if (error.request) {
        WMessage(`${t('errors.no_response')}:${error.request}`, 'error')
      } else {
        WMessage(`${t('errors.request_error')}:${error.message}`, 'error')
      }
    }
  })
});

////// lyric request moved to backend ////////////////
// export const lyricAlova = createAlova({
//   baseURL: "http://localhost:28883/api/v1/lyrics/",
//   statesHook: vueHook,
//   requestAdapter: adapterFetch(),
//   responded: {
//     onSuccess: (response) => {
//       if (response.status >= 400) {
//         return 'error'
//       }
//       return response.text()
//     },
//     onError: (): any => {
//       return 'error'
//     }
//   }
// })