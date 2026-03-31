import { Server, type Socket } from 'socket.io'

import { type SocketUser } from '../../modules/multiplayer/types/multiplayer.types'
import { inviteService } from '../../modules/multiplayer/services/invite.service'
import { presenceService } from '../services/presence.service'

export function registerInviteHandlers(io: Server, socket: Socket): void {
  const authenticatedUser = socket.data.user as SocketUser

  socket.on('invite:send', async (payload, callback) => {
    try {
      const { toUserId } = payload ?? {}
      if (!toUserId || typeof toUserId !== 'string') {
        return typeof callback === 'function'
          ? callback({ error: 'Invalid payload: toUserId is required' })
          : undefined
      }

      const inviteReceived = await inviteService.sendInvite(
        authenticatedUser.id,
        toUserId,
      )

      // deliver invite:received to all of the target user's active sockets
      const targetSocketIds = presenceService.getSocketIdsByUserId(toUserId)
      for (const socketId of targetSocketIds) {
        io.to(socketId).emit('invite:received', inviteReceived)
      }

      if (typeof callback === 'function') {
        callback({ success: true, inviteId: inviteReceived.inviteId })
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to send invite'
      if (typeof callback === 'function') {
        callback({ error: message })
      }
    }
  })

  socket.on('invite:accept', async (payload, callback) => {
    try {
      const { inviteId } = payload ?? {}
      if (!inviteId || typeof inviteId !== 'string') {
        return typeof callback === 'function'
          ? callback({ error: 'Invalid payload: inviteId is required' })
          : undefined
      }

      const result = await inviteService.acceptInvite(
        inviteId,
        authenticatedUser.id,
      )

      const statusPayload = {
        inviteId: result.inviteId,
        status: result.status,
      }

      // notify both users on all their active sockets
      emitToUser(io, result.fromUserId, 'invite:status', statusPayload)
      emitToUser(io, result.toUserId, 'invite:status', statusPayload)

      // TODO: Phase 7 will create the game here and emit game:started

      if (typeof callback === 'function') {
        callback({ success: true })
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to accept invite'
      if (typeof callback === 'function') {
        callback({ error: message })
      }
    }
  })

  socket.on('invite:decline', async (payload, callback) => {
    try {
      const { inviteId } = payload ?? {}
      if (!inviteId || typeof inviteId !== 'string') {
        return typeof callback === 'function'
          ? callback({ error: 'Invalid payload: inviteId is required' })
          : undefined
      }

      const result = await inviteService.declineInvite(
        inviteId,
        authenticatedUser.id,
      )

      const statusPayload = {
        inviteId: result.inviteId,
        status: result.status,
      }

      // notify both users on all their active sockets
      emitToUser(io, result.fromUserId, 'invite:status', statusPayload)
      emitToUser(io, result.toUserId, 'invite:status', statusPayload)

      if (typeof callback === 'function') {
        callback({ success: true })
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to decline invite'
      if (typeof callback === 'function') {
        callback({ error: message })
      }
    }
  })
}

// emit an event to all active sockets of a given user
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
