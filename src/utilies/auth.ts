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

/**
 * check whether the JWT token has expired
 * @param token JWT string（format: header.payload.signature）
 * @returns true - expired，false - not expired
 */
export function isTokenExpired(token: string): boolean {
  if (!token) {
    return true;
  }

  try {
    // payload is the second part
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) {
      return true; // invalid token structure
    }

    // Base64Url decode（pad '=' and replace '-' and '_' with '+' and '/'）
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='))
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload) as { exp?: number };

    if (typeof payload.exp !== 'number') {
      return true; // no exp field，take as expired
    }

    // exp is UNIX timestamp (s), transform to milliseconds
    const expirationTime = payload.exp * 1000;
    const now = Date.now();

    return expirationTime < now;
  } catch (error) {
    // failed to parse token, take as expired
    return true;
  }
}