import { refreshToken as refreshTokenApi } from '@/apis/methods/music'
import { ApiError } from '@/errors/apiError'
import { TokenStorage } from '@/utilies/auth'

export interface SessionTokenPair {
  access_token: string
  refresh_token: string
}

type InvalidationListener = () => void

/** 刷新失败后的冷却窗口：网络抖动期间避免每个并发请求各打一次 /auth/refresh */
const REFRESH_COOLDOWN_MS = 10_000

const listeners = new Set<InvalidationListener>()
let inflight: Promise<boolean> | null = null
let blockedUntil = 0

/** 登录态被判定失效时通知 UI 层同步清空内存状态 */
export function onAuthInvalidated(listener: InvalidationListener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function notifyInvalidated() {
  for (const listener of [...listeners]) {
    try {
      listener()
    } catch {
      // 单个监听器异常不应中断登出流程
    }
  }
}

/** 清空登录态的唯一入口：同时清 localStorage 与所有订阅者的内存状态 */
export function clearSession(): void {
  TokenStorage.clear()
  blockedUntil = 0
  notifyInvalidated()
}

/** 只有明确的凭证失效才允许登出；网络/超时/服务端临时故障一律保留 token 以便重试 */
export function isCredentialError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: unknown; httpStatus?: unknown }
  if (e.httpStatus === 401) return true
  return e.code === 'UNAUTHORIZED' || e.code === 20002 || e.code === '20002'
}

/**
 * 全局唯一的刷新入口（single-flight）：路由守卫与 Alova 拦截器共用，
 * 避免并发刷新互相作废后端的一次性 refresh token。
 * 返回 true = 已拿到新 token；false = 本次不可用，原请求继续或稍后重试。
 */
export function refreshSession(): Promise<boolean> {
  if (inflight) return inflight
  if (Date.now() < blockedUntil) return Promise.resolve(false)

  const token = TokenStorage.getRefreshToken()
  if (!token) return Promise.resolve(false)

  inflight = (async () => {
    try {
      const data = await refreshTokenApi(token) as SessionTokenPair | undefined
      if (!data || typeof data.access_token !== 'string' || typeof data.refresh_token !== 'string') {
        throw new ApiError({ code: 'INVALID_REFRESH_RESPONSE', display: 'silent' })
      }
      TokenStorage.setAccessToken(data.access_token)
      TokenStorage.setRefreshToken(data.refresh_token)
      blockedUntil = 0
      return true
    } catch (error) {
      if (isCredentialError(error)) {
        clearSession()
      } else {
        blockedUntil = Date.now() + REFRESH_COOLDOWN_MS
      }
      return false
    } finally {
      inflight = null
    }
  })()
  return inflight
}
