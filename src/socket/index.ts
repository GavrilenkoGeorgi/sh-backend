import { type Server as HttpServer } from 'http'
import { Server } from 'socket.io'

import { socketAuth } from './auth'
import { registerPresenceHandlers } from './handlers/presence.handlers'

let io: Server

export function initializeSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  })

  io.use(socketAuth)

  // TODO: remove after testing is complete
  io.on('connection', (socket) => {
    registerPresenceHandlers(io, socket)
    socket.emit('debug:connected', {
      socketId: socket.id,
      userId: socket.data.user.id,
    })

    socket.on('debug:ping', (payload) => {
      socket.emit('debug:pong', {
        received: payload,
        socketId: socket.id,
        userId: socket.data.user.id,
      })
    })
  })

  return io
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO not initialized')
  }
  return io
}
