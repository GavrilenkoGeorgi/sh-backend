// API Route Constants
export const USER_ROUTES = {
  REGISTER: '/register',
  LOGIN: '/login',
  REFRESH: '/refresh',
  LOGOUT: '/logout',
  ACTIVATE: '/activate/:link',
  FORGOT_PASSWORD: '/forgotpwd',
  UPDATE_PASSWORD: '/updatepwd',
  DELETE: '/delete',
  PROFILE: '/profile',
} as const

export const GAME_ROUTES = {
  SAVE: '/save',
  STATS: '/stats',
  USER_RESULTS: '/user-results',
  CLEAR_STATS: '/clearstats',
} as const

// Base API paths
export const API_BASE_PATHS = {
  USERS: '/users',
  GAME: '/game',
} as const

// Helper functions for URL construction
export const buildApiUrl = (
  basePath: string,
  route: string,
  params?: Record<string, string>
): string => {
  let url = `${basePath}${route}`

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value)
    })
  }

  return url
}

export const buildUserUrl = (
  route: string,
  params?: Record<string, string>
): string => {
  return buildApiUrl(API_BASE_PATHS.USERS, route, params)
}

export const buildGameUrl = (
  route: string,
  params?: Record<string, string>
): string => {
  return buildApiUrl(API_BASE_PATHS.GAME, route, params)
}
