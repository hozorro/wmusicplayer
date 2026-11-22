import { describe, it, expect, vi, beforeEach } from 'vitest'

const { logoutMock, replaceMock } = vi.hoisted(() => ({
  logoutMock: vi.fn(),
  replaceMock: vi.fn(),
}))

vi.mock('@/store/auth', () => ({
  useAuthStore: () => ({ logout: logoutMock }),
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: replaceMock }),
}))

import { useLogout } from '../useLogout'

describe('useLogout', () => {
  beforeEach(() => {
    logoutMock.mockReset().mockResolvedValue(undefined)
    replaceMock.mockReset().mockResolvedValue(undefined)
  })

  it('clears the session before navigating to the login page', async () => {
    const { logout, pending } = useLogout()

    await logout()

    expect(logoutMock).toHaveBeenCalledTimes(1)
    expect(replaceMock).toHaveBeenCalledWith({ path: '/login' })
    expect(logoutMock.mock.invocationCallOrder[0]).toBeLessThan(replaceMock.mock.invocationCallOrder[0])
    expect(pending.value).toBe(false)
  })

  it('coalesces concurrent confirmations into a single logout', async () => {
    let resolveLogout!: () => void
    logoutMock.mockReturnValue(new Promise<void>(resolve => { resolveLogout = resolve }))
    const { logout, pending } = useLogout()

    const first = logout()
    const second = logout()
    expect(pending.value).toBe(true)
    resolveLogout()

    await Promise.all([first, second])
    expect(logoutMock).toHaveBeenCalledTimes(1)
    expect(replaceMock).toHaveBeenCalledTimes(1)
    expect(pending.value).toBe(false)
  })

  it('does not throw and resets pending when navigation fails', async () => {
    replaceMock.mockRejectedValueOnce(new Error('navigation aborted'))
    const { logout, pending } = useLogout()

    await expect(logout()).resolves.toBeUndefined()
    expect(pending.value).toBe(false)

    await logout()
    expect(logoutMock).toHaveBeenCalledTimes(2)
  })

  it('does not navigate when clearing the session itself fails', async () => {
    logoutMock.mockRejectedValueOnce(new Error('storage unavailable'))
    const { logout, pending } = useLogout()

    await expect(logout()).resolves.toBeUndefined()
    expect(replaceMock).not.toHaveBeenCalled()
    expect(pending.value).toBe(false)
  })
})
