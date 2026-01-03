import { axiosRequestAdapter } from "@alova/adapter-axios";
import { createAlova } from "alova";
import type { AxiosError } from "axios";
import { createClientTokenAuthentication } from "alova/client";
import VueHook from "alova/vue";
import { refreshToken } from "./methods/music";
import { isTokenExpired } from "@/utilies/general";
import WMessage from "@/composables/message";

const { onAuthRequired, onResponseRefreshToken } = createClientTokenAuthentication<typeof VueHook, typeof axiosRequestAdapter>({
  assignToken: (method) => {
    if (method.meta?.authRole === 'refreshToken') { // 此处method.meta后必须加?，否则IDE不会报错单运行时会报错，导致路由导航中getCurrentUser()方法返回undefined
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
        WMessage('数据错误['+resData.code+']: '+resData.msg, "error")
        return
      }
      return resData.data
    },
    onError: (error: AxiosError) => {
      if (error.response) {
        switch (error.response.status) { 
          case 401: 
            WMessage('登录已过期，请重新登录', 'error')
            break;
          case 404:
            WMessage('未找到该资源', 'error')
            break;
          case 500: 
            WMessage('服务器错误，请稍后再试', 'error')
            break;
          default: 
            WMessage(`未知错误[${error.response.status}]:${error.message}`, 'error')
        }
      } else if (error.request) {
        WMessage(`未收到相应:${error.request}`, 'error')
      } else {
        WMessage(`请求时出错:${error.message}`, 'error')
      }
    }
  })
});

// export const uploadAlova = createAlova({
//   baseURL: "/apiv2/",
//   statesHook: vueHook,
//   requestAdapter: axiosRequestAdapter(),
//   timeout: 60000,
//   responded: {
//     onSuccess: (response) => {
//       if (response.status >= 400) {
//         WMessage("请求错误[" + response.status + ']', "error")
//         return
//       }
//       const resData = response.data
//       if(resData.code !== 200){
//         // console.log(resData)
//         WMessage('数据错误['+resData.code+']: '+resData.msg, "error")
//         return
//       }
//       return resData.data
//     },
//     onError: (err) => {
//       WMessage('网络错误: '+err.message, "error")
//     }
//   }
// });

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