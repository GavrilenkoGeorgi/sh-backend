import { Server, type Socket } from 'socket.io'

import { type SocketUser } from '../../modules/multiplayer/types/multiplayer.types'
import { gameService } from '../../modules/multiplayer/services/game.service'
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

  socket.on('disconnect', async () => {
    presenceService.removeConnection({
      userId: authenticatedUser.id,
      socketId: socket.id,
    })
    presenceService.broadcastOnlineUsers(io)

    // only treat this as user disconnect when no sockets remain
    if (presenceService.isUserOnline(authenticatedUser.id)) {
      return
    }

    try {
      const endedGames = await gameService.endActiveGamesForDisconnectedUser(
        authenticatedUser.id,
      )

      for (const endedGame of endedGames) {
        emitToUser(
          io,
          endedGame.remainingUserId,
          'game:ended',
          endedGame.payload,
        )
      }
    } catch (error) {
      // keep disconnect flow resilient even if game cleanup fails
      console.error('failed to handle multiplayer disconnect cleanup', error)
    }
  })
}

function emitToUser(
  io: Server,
  userId: string,
  event: string,
  payload: unknown,
): void {
  const socketIds = presenceService.getSocketIdsByUserId(userId)
  for (const socketId of socketIds) {
    io.to(socketId).emit(event, payload)
  }
}
