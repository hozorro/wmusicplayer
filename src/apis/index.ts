import { axiosRequestAdapter } from "@alova/adapter-axios";
import { createAlova } from "alova";
import adapterFetch from "alova/fetch";
import vueHook from "alova/vue";
import WMessage from "@/composables/message";

export const generalAlova = createAlova({
  baseURL: "/apiv2/",
  statesHook: vueHook,
  requestAdapter: adapterFetch(),
  responded: {
    onSuccess: async (response) => {
      if (response.status >= 501) {
        WMessage("服务器错误[" + response.status + ']', "error")
        return
      }
      else if (response.status >= 400) {
        WMessage("请求错误[" + response.status + ']', "error")
        return
      }
      const resData = await response.json()
      console.log(resData)
      if(resData.code !== 200){
        WMessage('数据错误['+resData.code+']: '+resData.msg, "error")
        return
      }
      return resData.data
    },
    onError: (err) => {
      WMessage('网络错误: '+err.message, "error")
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