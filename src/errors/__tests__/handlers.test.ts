import { describe, it, expect, vi, beforeEach } from 'vitest'

const { redirectToLogin, toast } = vi.hoisted(() => ({
  redirectToLogin: vi.fn().mockResolvedValue(undefined),
  toast: vi.fn(),
}))

vi.mock('@/store/auth', () => ({
  useAuthStore: () => ({ redirectToLogin }),
}))
vi.mock('@/services/toast', () => ({ toast }))
vi.mock('@/i18n/translate', () => ({ translateApiError: () => 'translated' }))

import { handleGlobalApiError } from '../handlers'
import { ApiError } from '../apiError'
import type { Method } from 'alova'

function methodWithRole(role?: string): Method {
  return { meta: role ? { authRole: role } : {} } as unknown as Method
}

const unauthorized = () => new ApiError({ code: 'UNAUTHORIZED', httpStatus: 401, display: 'silent' })

describe('handleGlobalApiError / 401 routing', () => {
  beforeEach(() => {
    redirectToLogin.mockClear()
    toast.mockClear()
  })

  it('redirects to login for a normal business request', () => {
    handleGlobalApiError(unauthorized(), methodWithRole())
    expect(redirectToLogin).toHaveBeenCalledTimes(1)
  })

  it('does not redirect for auth-flow requests (login/refreshToken/logout)', () => {
    for (const role of ['login', 'refreshToken', 'logout']) {
      handleGlobalApiError(unauthorized(), methodWithRole(role))
    }
    expect(redirectToLogin).not.toHaveBeenCalled()
  })

  it('treats backend code 20002 as credential loss', () => {
    const error = new ApiError({ code: 20002, display: 'toast' })
    handleGlobalApiError(error, methodWithRole())
    expect(redirectToLogin).toHaveBeenCalledTimes(1)
  })

  it('never redirects on transient network errors', () => {
    const error = new ApiError({ code: 'NETWORK_ERROR', display: 'toast' })
    handleGlobalApiError(error, methodWithRole())
    expect(redirectToLogin).not.toHaveBeenCalled()
  })

  it('handles each error only once', () => {
    const error = unauthorized()
    handleGlobalApiError(error, methodWithRole())
    handleGlobalApiError(error, methodWithRole())
    expect(redirectToLogin).toHaveBeenCalledTimes(1)
  })
})
