import { describe, it, expect, vi, beforeEach } from 'vitest'

const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, value) },
  removeItem: (key: string) => { storage.delete(key) },
  clear: () => storage.clear(),
  key: (index: number) => [...storage.keys()][index] ?? null,
  get length() { return storage.size },
})

const { refreshTokenMock } = vi.hoisted(() => ({ refreshTokenMock: vi.fn() }))
vi.mock('@/apis/methods/music', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  refreshToken: (...args: unknown[]) => refreshTokenMock(...args),
}))
vi.mock('@/router', () => ({
  default: {
    currentRoute: { value: { path: '/', fullPath: '/' } },
    replace: vi.fn().mockResolvedValue(undefined),
  },
}))
vi.mock('@/i18n/translate', () => ({
  translateApiError: () => 'translated',
  translateFieldErrors: () => ({}),
}))

import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../auth'
import { clearSession, refreshSession } from '@/apis/auth-session'
import { TokenStorage } from '@/utilies/auth'
import { ApiError } from '@/errors/apiError'

describe('auth store <-> auth session', () => {
  beforeEach(() => {
    storage.clear()
    refreshTokenMock.mockReset()
    setActivePinia(createPinia())
    // 重置 auth-session 的模块级冷却窗口，保证用例之间互不影响
    clearSession()
  })

  it('keeps store refs in sync when the shared session is invalidated', () => {
    const store = useAuthStore()
    store.accessToken = 'access'
    store.refreshToken = 'refresh'
    expect(store.isAuthenticated).toBe(true)

    clearSession()

    expect(store.isAuthenticated).toBe(false)
    expect(store.accessToken).toBe('')
    expect(store.refreshToken).toBe('')
  })

  it('delegates refresh() to the shared single-flight session', async () => {
    const store = useAuthStore()
    TokenStorage.setRefreshToken('refresh')
    refreshTokenMock.mockResolvedValue({ access_token: 'new-access', refresh_token: 'new-refresh' })

    expect(await store.refresh()).toBe(true)
    expect(refreshTokenMock).toHaveBeenCalledWith('refresh')
    expect(store.isAuthenticated).toBe(true)
    expect(store.accessToken).toBe('new-access')
  })

  it('leaves the store logged in when refresh fails with a network error', async () => {
    const store = useAuthStore()
    store.accessToken = 'access'
    TokenStorage.setAccessToken('access')
    TokenStorage.setRefreshToken('refresh')
    refreshTokenMock.mockRejectedValue(new ApiError({ code: 'NETWORK_ERROR', display: 'toast' }))

    expect(await store.refresh()).toBe(false)
    expect(store.isAuthenticated).toBe(true)
    expect(TokenStorage.getRefreshToken()).toBe('refresh')
  })

  it('clears the store when refresh reports credential loss', async () => {
    const store = useAuthStore()
    store.accessToken = 'access'
    TokenStorage.setAccessToken('access')
    TokenStorage.setRefreshToken('refresh')
    refreshTokenMock.mockRejectedValue(new ApiError({ code: 20002, httpStatus: 401, display: 'silent' }))

    expect(await refreshSession()).toBe(false)
    expect(store.isAuthenticated).toBe(false)
    expect(TokenStorage.getRefreshToken()).toBeNull()
  })
})
