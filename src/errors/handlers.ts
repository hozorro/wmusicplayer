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

  // 2. 登录失效：仅普通业务请求跳转，鉴权流程自身由 auth-session 统一处理
  const isCredentialFailure = error.code === 'UNAUTHORIZED'
    || error.httpStatus === 401
    || error.code === 20002
    || error.code === '20002'
  if (isCredentialFailure) {
    const role = method?.meta?.authRole
    const isAuthFlow = role === 'login' || role === 'refreshToken' || role === 'logout'
    if (!isAuthFlow) {
      const authStore = useAuthStore()
      void authStore.redirectToLogin().catch(() => {})
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