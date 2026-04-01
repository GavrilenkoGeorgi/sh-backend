import jwt from 'jsonwebtoken'
import { type Socket } from 'socket.io'

import User from '../models/userModel'

function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(';').reduce(
    (acc, pair) => {
      const [key, ...rest] = pair.trim().split('=')
      if (key) {
        acc[key] = decodeURIComponent(rest.join('='))
      }
      return acc
    },
    {} as Record<string, string>,
  )
}

function isLocalDebugSocket(socket: Socket): boolean {
  const host = socket.handshake.headers.host?.toLowerCase() || ''
  const isLocalHost =
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    host.includes('::1')

  return process.env.NODE_ENV !== 'production' && isLocalHost
}

function readBearerToken(
  authorizationHeader: string | string[] | undefined,
): string | undefined {
  const headerValue = Array.isArray(authorizationHeader)
    ? authorizationHeader[0]
    : authorizationHeader

  if (!headerValue) {
    return undefined
  }

  const [scheme, token] = headerValue.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return undefined
  }

  return token
}

function readTokenFromQuery(queryToken: unknown): string | undefined {
  if (typeof queryToken === 'string') {
    return queryToken
  }

  if (Array.isArray(queryToken) && typeof queryToken[0] === 'string') {
    return queryToken[0]
  }

  return undefined
}

function resolveAccessToken(socket: Socket): string | undefined {
  const cookieHeader = socket.handshake.headers.cookie
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader)
    if (cookies.accessToken) {
      return cookies.accessToken
    }
  }

  // allow fallback token transport for local debugging tools like Postman
  if (!isLocalDebugSocket(socket)) {
    return undefined
  }

  const authToken = socket.handshake.auth?.accessToken
  if (typeof authToken === 'string' && authToken.length > 0) {
    return authToken
  }

  const queryToken = readTokenFromQuery(socket.handshake.query.accessToken)
  if (queryToken) {
    return queryToken
  }

  return readBearerToken(socket.handshake.headers.authorization)
}

// socket authentication middleware reusing existing JWT flow
export async function socketAuth(
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> {
  try {
    const token = resolveAccessToken(socket)
    if (!token) {
      return next(new Error('Authentication error: missing access token'))
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || '',
    ) as jwt.JwtPayload
    const user = await User.findById(decoded.id).select('-password')
    if (!user) {
      return next(new Error('Authentication error: user not found'))
    }

    // attach user data to socket for use in handlers
    socket.data.user = {
      id: user._id.toString(),
      username: user.name,
    }

    next()
  } catch {
    next(new Error('Authentication error.'))
  }
}
