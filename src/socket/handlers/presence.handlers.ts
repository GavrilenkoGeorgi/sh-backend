import { Server, type Socket } from 'socket.io'

import { type SocketUser } from '../../modules/multiplayer/types/multiplayer.types'
import { presenceService } from '../services/presence.service'

export function registerPresenceHandlers(io: Server, socket: Socket): void {
  const authenticatedUser = socket.data.user as SocketUser

  // every authenticated connection updates the global online users snapshot
  presenceService.addConnection({
    userId: authenticatedUser.id,
    username: authenticatedUser.username,
    socketId: socket.id,
  })
  presenceService.broadcastOnlineUsers(io)

  socket.on('disconnect', () => {
    presenceService.removeConnection({
      userId: authenticatedUser.id,
      socketId: socket.id,
    })
    presenceService.broadcastOnlineUsers(io)
  })
}
