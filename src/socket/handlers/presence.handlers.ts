import { Server, type Socket } from 'socket.io'

import { type SocketUser } from '../../modules/multiplayer/types/multiplayer.types'
import { gameService } from '../../modules/multiplayer/services/game.service'
import { inviteService } from '../../modules/multiplayer/services/invite.service'
import { presenceService } from '../services/presence.service'

// not awaited by callers: a failed write must not break the socket flow
function recordLastSeen(userId: string): void {
  inviteService.recordLastSeen(userId).catch((error: unknown) => {
    console.error('failed to record last seen', error)
  })
}

export function registerPresenceHandlers(io: Server, socket: Socket): void {
  const authenticatedUser = socket.data.user as SocketUser

  // every authenticated connection updates the global online users snapshot
  presenceService.addConnection({
    userId: authenticatedUser.id,
    username: authenticatedUser.username,
    socketId: socket.id,
  })
  presenceService.broadcastOnlineUsers(io)
  // also on connect, so a server restart (no disconnect event) doesn't lose it
  recordLastSeen(authenticatedUser.id)

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

    recordLastSeen(authenticatedUser.id)

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

// TODO: emitToUser is duplicated in invite.handlers.ts and multiplayerController.ts, extract a shared helper into src/socket/services/
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
