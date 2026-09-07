import type { ApiError } from "./apiError";
import { useAuthStore } from "@/store/auth";
import { translateApiError } from "@/i18n/translate";
import { toast } from "@/services/toast";
import type { Method } from "alova";


export function handleGlobalApiError(error: ApiError, method?: Method) {
  if (error.handleByGlobal) {
    return
  }

  error.handleByGlobal = true

  // 1. 上报 - 暂无上报机制，后续可添加

  // 2. 登录失效
  if (error.code === 'UNAUTHORIZED' || error.httpStatus === 401) {
    const isLoginRequest = method?.meta?.authRole === 'login'
    if (!isLoginRequest) {
      const authStore = useAuthStore()
      authStore.redirectToLogin()
      return
    }
  }

  // 3. 静默处理
  if (error.display === 'silent') {
    return
  }

  // 4. 表单错误交给表单组件
  if (error.display === 'form') {
    return
  }

  // 5. 页面错误交给页面状态
  if (error.display === 'page') {
    return
  }

  // 6. 播放器错误交给播放器状态
  if (error.display === 'player') {
    return
  }

  // 7. 普通操作错误默认 toast
  const message = translateApiError(error)
  toast(`[${error.code}]${message}`, 'error')
}