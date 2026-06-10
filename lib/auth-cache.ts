interface UserCache {
  user: unknown | null
  token: string | null
  timestamp: number
}

const CACHE_DURATION = 15 * 60 * 1000
let authCache: UserCache = {
  user: null,
  token: null,
  timestamp: 0,
}

export function getAuthCache(): UserCache {
  const now = Date.now()
  if (now - authCache.timestamp > CACHE_DURATION) {
    authCache = {
      user: null,
      token: null,
      timestamp: 0,
    }
  }
  return authCache
}

export function setAuthCache(user: unknown | null, token: string | null): void {
  authCache = {
    user,
    token,
    timestamp: Date.now(),
  }
}

export function invalidateAuthCache(): void {
  authCache = {
    user: null,
    token: null,
    timestamp: 0,
  }
}
