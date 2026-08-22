import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isTokenExpired } from '../auth'

// Mock localStorage for node environment
const mockStorage = new Map<string, string>()
const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { mockStorage.set(key, value) }),
  removeItem: vi.fn((key: string) => { mockStorage.delete(key) }),
  clear: vi.fn(() => { mockStorage.clear() }),
  get length() { return mockStorage.size },
  key: vi.fn((index: number) => [...mockStorage.keys()][index] ?? null),
}
vi.stubGlobal('localStorage', localStorageMock)

// Mock navigator and screen for getDeviceId
vi.stubGlobal('navigator', { userAgent: 'test-agent' })
vi.stubGlobal('screen', { width: 1920, height: 1080 })

import { TokenStorage } from '@/utilies/auth'

describe('TokenStorage', () => {
  beforeEach(() => {
    mockStorage.clear()
    vi.clearAllMocks()
  })

  describe('access token', () => {
    it('sets and gets access token', () => {
      TokenStorage.setAccessToken('abc123')
      expect(TokenStorage.getAccessToken()).toBe('abc123')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('player_access_token', 'abc123')
    })

    it('returns null when no access token', () => {
      expect(TokenStorage.getAccessToken()).toBeNull()
    })

    it('removes access token', () => {
      TokenStorage.setAccessToken('abc123')
      TokenStorage.removeAccessToken()
      expect(TokenStorage.getAccessToken()).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('player_access_token')
    })
  })

  describe('refresh token', () => {
    it('sets and gets refresh token', () => {
      TokenStorage.setRefreshToken('refresh456')
      expect(TokenStorage.getRefreshToken()).toBe('refresh456')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('player_refresh_token', 'refresh456')
    })

    it('returns null when no refresh token', () => {
      expect(TokenStorage.getRefreshToken()).toBeNull()
    })

    it('removes refresh token', () => {
      TokenStorage.setRefreshToken('refresh456')
      TokenStorage.removeRefreshToken()
      expect(TokenStorage.getRefreshToken()).toBeNull()
    })
  })

  describe('clear()', () => {
    it('removes both tokens', () => {
      TokenStorage.setAccessToken('token1')
      TokenStorage.setRefreshToken('token2')
      TokenStorage.clear()
      expect(TokenStorage.getAccessToken()).toBeNull()
      expect(TokenStorage.getRefreshToken()).toBeNull()
    })
  })

  describe('hasToken()', () => {
    it('returns true when access token exists', () => {
      TokenStorage.setAccessToken('token')
      expect(TokenStorage.hasToken()).toBe(true)
    })

    it('returns false when no access token', () => {
      expect(TokenStorage.hasToken()).toBe(false)
    })
  })

  describe('getDeviceId()', () => {
    it('generates and stores device id on first call', () => {
      const deviceId = TokenStorage.getDeviceId()
      expect(deviceId).toBeTruthy()
      expect(typeof deviceId).toBe('string')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('player_device_id', deviceId)
    })

    it('returns stored device id on subsequent calls', () => {
      const id1 = TokenStorage.getDeviceId()
      const id2 = TokenStorage.getDeviceId()
      expect(id1).toBe(id2)
    })
  })

  describe('isTokenExpired', () => {
    function makeJWT(exp: number | null): string {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      const payload = exp !== null
        ? btoa(JSON.stringify({ sub: 'user1', exp }))
        : btoa(JSON.stringify({ sub: 'user1' }))
      const sig = 'fake_signature'
      return `${header}.${payload}.${sig}`
    }
  
    it('returns true for empty string', () => {
      expect(isTokenExpired('')).toBe(true)
    })
  
    it('returns true for invalid token structure', () => {
      expect(isTokenExpired('not.a.valid.token')).toBe(true)
      expect(isTokenExpired('justonepart')).toBe(true)
    })
  
    it('returns true when token has no exp field', () => {
      const token = makeJWT(null)
      expect(isTokenExpired(token)).toBe(true)
    })
  
    it('returns true for expired token', () => {
      // exp = 1 second ago
      const token = makeJWT(Math.floor(Date.now() / 1000) - 1)
      expect(isTokenExpired(token)).toBe(true)
    })
  
    it('returns false for valid (non-expired) token', () => {
      // exp = 1 hour from now
      const token = makeJWT(Math.floor(Date.now() / 1000) + 3600)
      expect(isTokenExpired(token)).toBe(false)
    })
  })
})
