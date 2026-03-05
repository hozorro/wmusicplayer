const TOKEN_PREFIX = import.meta.env.VITE_TOKEN_PREFIX || 'player_';

export const TokenStorage = { 
  // access token
  setAccessToken(token: string): void {
    localStorage.setItem(`${TOKEN_PREFIX}access_token`, token)
  },

  getAccessToken(): string | null {
    return localStorage.getItem(`${TOKEN_PREFIX}access_token`)
  },

  removeAccessToken(): void {
    localStorage.removeItem(`${TOKEN_PREFIX}access_token`)
  },

  // refresh token
  setRefreshToken(token: string): void {
    localStorage.setItem(`${TOKEN_PREFIX}refresh_token`, token)
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(`${TOKEN_PREFIX}refresh_token`)
  },

  removeRefreshToken(): void {
    localStorage.removeItem(`${TOKEN_PREFIX}refresh_token`)
  },

  // clear all tokens
  clear(): void {
    localStorage.removeItem(`${TOKEN_PREFIX}access_token`)
    localStorage.removeItem(`${TOKEN_PREFIX}refresh_token`)
  },

  // check if any token valid exists
  hasToken(): boolean {
    return !!this.getAccessToken()
  },

  // get device id (used for multi device login)
  getDeviceId(): string {
    let deviceId = localStorage.getItem(`${TOKEN_PREFIX}device_id`)
    if (!deviceId) {
      // generate device id: UserAgent + screen size + random string
      deviceId = btoa(
        navigator.userAgent + 
        screen.width + 'x' + screen.height +
        Math.random().toString(36).substring(2)
      ).substring(0, 32)
      localStorage.setItem(`${TOKEN_PREFIX}device_id`, deviceId)
    }
    return deviceId
  },
}