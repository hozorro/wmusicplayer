import { axiosRequestAdapter } from "@alova/adapter-axios";
import { createAlova } from "alova";
import adapterFetch from "alova/fetch";
import vueHook from "alova/vue";

export const generalAlova = createAlova({
  baseURL: "/apiv2/",
  statesHook: vueHook,
  requestAdapter: adapterFetch(),
  responded: {
    onSuccess: async (response) => {
      if (response.status >= 501) {
        alert('响应错误')
        return
      }
      else if (response.status >= 400) {
        alert('请求错误')
        return
      }
      const resData = await response.json()
      if(resData.code !== 200){
        alert('数据错误['+resData.code+']\n'+resData.message)
      }
      return resData.data
    },
    onError: (err) => {
      alert('网络错误:' + err.message)
    }
  }
});

export const uploadAlova = createAlova({
  baseURL: "/apiv2/",
  statesHook: vueHook,
  requestAdapter: axiosRequestAdapter(),
  timeout: 60000,
  responded: {
    onSuccess: (response) => {
      if (response.status >= 400) {
        alert('请求错误')
      }
      const resData = response.data
      if(resData.code !== 200){
        console.log(resData)
        alert('数据错误')
      }
      return resData.data
    },
    onError: (err) => {
      alert('网络错误:' + err.message)
    }
  }
});