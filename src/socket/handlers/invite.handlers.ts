import { Server, type Socket } from 'socket.io'

import { type SocketUser } from '../../modules/multiplayer/types/multiplayer.types'
import { inviteService } from '../../modules/multiplayer/services/invite.service'
import { presenceService } from '../services/presence.service'

export function registerInviteHandlers(io: Server, socket: Socket): void {
  const authenticatedUser = socket.data.user as SocketUser

  socket.on('invite:send', async (payload, callback) => {
    try {
      const toUserId =
        typeof payload?.toUserId === 'string' ? payload.toUserId.trim() : ''

      if (!toUserId) {
        return emitActionError(
          socket,
          callback,
          'invite:send',
          'Invalid payload: toUserId is required',
        )
      }

      // sendInvite persists the invite in MongoDB before returning
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
      emitActionError(socket, callback, 'invite:send', message)
    }
  })

  socket.on('invite:accept', async (payload, callback) => {
    try {
      const inviteId =
        typeof payload?.inviteId === 'string' ? payload.inviteId.trim() : ''

      if (!inviteId) {
        return emitActionError(
          socket,
          callback,
          'invite:accept',
          'Invalid payload: inviteId is required',
        )
      }

      const result = await inviteService.acceptInvite(
        inviteId,
        authenticatedUser.id,
      )

      const statusPayload = {
        inviteId: result.inviteId,
        status: result.status,
      }

      // acceptInvite updates the DB before this status event is emitted
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
      emitActionError(socket, callback, 'invite:accept', message)
    }
  })

  socket.on('invite:decline', async (payload, callback) => {
    try {
      const inviteId =
        typeof payload?.inviteId === 'string' ? payload.inviteId.trim() : ''

      if (!inviteId) {
        return emitActionError(
          socket,
          callback,
          'invite:decline',
          'Invalid payload: inviteId is required',
        )
      }

      const result = await inviteService.declineInvite(
        inviteId,
        authenticatedUser.id,
      )

      const statusPayload = {
        inviteId: result.inviteId,
        status: result.status,
      }

      // declineInvite updates the DB before this status event is emitted
      // notify both users on all their active sockets
      emitToUser(io, result.fromUserId, 'invite:status', statusPayload)
      emitToUser(io, result.toUserId, 'invite:status', statusPayload)

      if (typeof callback === 'function') {
        callback({ success: true })
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to decline invite'
      emitActionError(socket, callback, 'invite:decline', message)
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

function emitActionError(
  socket: Socket,
  callback: unknown,
  action: 'invite:send' | 'invite:accept' | 'invite:decline',
  message: string,
): void {
  if (typeof callback === 'function') {
    callback({ error: message })
  }

  // non-ack clients (for example Postman) can still observe why the action failed
  socket.emit('invite:error', {
    action,
    message,
  })
}
