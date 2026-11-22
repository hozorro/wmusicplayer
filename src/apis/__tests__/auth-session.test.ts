import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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
  refreshToken: (...args: unknown[]) => refreshTokenMock(...args),
}))

import {
  refreshSession,
  clearSession,
  onAuthInvalidated,
  isCredentialError,
} from '../auth-session'
import { ApiError } from '@/errors/apiError'
import { TokenStorage } from '@/utilies/auth'

const credentialError = () => new ApiError({ code: 20002, httpStatus: 401, display: 'silent' })
const networkError = () => new ApiError({ code: 'NETWORK_ERROR', display: 'toast' })
const timeoutError = () => new ApiError({ code: 'TIMEOUT', display: 'toast' })
const serverError = () => new ApiError({ code: 'HTTP_503', httpStatus: 503, display: 'toast' })

function seedTokens() {
  TokenStorage.setAccessToken('old-access')
  TokenStorage.setRefreshToken('old-refresh')
}

describe('isCredentialError', () => {
  it('recognizes explicit credential failures', () => {
    expect(isCredentialError(credentialError())).toBe(true)
    expect(isCredentialError(new ApiError({ code: 'UNAUTHORIZED', httpStatus: 401, display: 'silent' }))).toBe(true)
    expect(isCredentialError(new ApiError({ code: 20002, display: 'toast' }))).toBe(true)
  })

  it('does not treat transient failures as credential loss', () => {
    expect(isCredentialError(networkError())).toBe(false)
    expect(isCredentialError(timeoutError())).toBe(false)
    expect(isCredentialError(serverError())).toBe(false)
    expect(isCredentialError(new TypeError('Cannot destructure undefined'))).toBe(false)
    expect(isCredentialError(null)).toBe(false)
  })
})

describe('refreshSession', () => {
  beforeEach(() => {
    storage.clear()
    refreshTokenMock.mockReset()
    // 每个用例从干净的会话状态开始（同时重置冷却窗口）
    clearSession()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not call the API when there is no refresh token', async () => {
    expect(await refreshSession()).toBe(false)
    expect(refreshTokenMock).not.toHaveBeenCalled()
  })

  it('stores the renewed token pair on success', async () => {
    seedTokens()
    refreshTokenMock.mockResolvedValue({ access_token: 'new-access', refresh_token: 'new-refresh' })

    expect(await refreshSession()).toBe(true)
    expect(refreshTokenMock).toHaveBeenCalledWith('old-refresh')
    expect(TokenStorage.getAccessToken()).toBe('new-access')
    expect(TokenStorage.getRefreshToken()).toBe('new-refresh')
  })

  it('coalesces concurrent refreshes into a single request', async () => {
    seedTokens()
    let resolveRefresh!: (value: unknown) => void
    refreshTokenMock.mockReturnValue(new Promise(resolve => { resolveRefresh = resolve }))

    const pending = Promise.all([refreshSession(), refreshSession(), refreshSession()])
    await Promise.resolve()
    expect(refreshTokenMock).toHaveBeenCalledTimes(1)

    resolveRefresh({ access_token: 'new-access', refresh_token: 'new-refresh' })
    expect(await pending).toEqual([true, true, true])
  })

  it('keeps tokens on network/timeout/5xx and backs off before retrying', async () => {
    seedTokens()
    const listener = vi.fn()
    const unsubscribe = onAuthInvalidated(listener)
    refreshTokenMock.mockRejectedValue(networkError())

    expect(await refreshSession()).toBe(false)
    expect(TokenStorage.getAccessToken()).toBe('old-access')
    expect(TokenStorage.getRefreshToken()).toBe('old-refresh')
    expect(listener).not.toHaveBeenCalled()

    // 冷却期内不再打刷新接口
    expect(await refreshSession()).toBe(false)
    expect(refreshTokenMock).toHaveBeenCalledTimes(1)

    // 冷却结束后允许重试
    vi.advanceTimersByTime(11_000)
    refreshTokenMock.mockResolvedValue({ access_token: 'new-access', refresh_token: 'new-refresh' })
    expect(await refreshSession()).toBe(true)
    expect(refreshTokenMock).toHaveBeenCalledTimes(2)
    unsubscribe()
  })

  it('clears tokens and notifies listeners only on credential errors', async () => {
    seedTokens()
    const listener = vi.fn()
    const unsubscribe = onAuthInvalidated(listener)
    refreshTokenMock.mockRejectedValue(credentialError())

    expect(await refreshSession()).toBe(false)
    expect(TokenStorage.getAccessToken()).toBeNull()
    expect(TokenStorage.getRefreshToken()).toBeNull()
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('does not treat a malformed success payload as credential loss', async () => {
    seedTokens()
    refreshTokenMock.mockResolvedValue(undefined)

    expect(await refreshSession()).toBe(false)
    expect(TokenStorage.getRefreshToken()).toBe('old-refresh')
  })
})

describe('clearSession', () => {
  beforeEach(() => {
    storage.clear()
  })

  it('removes both tokens and notifies every listener once', () => {
    seedTokens()
    const first = vi.fn()
    const second = vi.fn()
    const offFirst = onAuthInvalidated(first)
    const offSecond = onAuthInvalidated(second)

    clearSession()

    expect(TokenStorage.getAccessToken()).toBeNull()
    expect(TokenStorage.getRefreshToken()).toBeNull()
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
    offFirst()
    offSecond()
  })
})
