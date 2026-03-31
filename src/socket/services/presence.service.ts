import type { Server } from 'socket.io'

import { type OnlineUser } from '../../modules/multiplayer/types/multiplayer.types'

interface PresenceConnection {
  userId: string
  username: string
  socketId: string
}

interface PresenceDisconnection {
  userId: string
  socketId: string
}

class PresenceService {
  private socketsByUserId = new Map<string, Set<string>>()

  private usernamesByUserId = new Map<string, string>()

  addConnection(connection: PresenceConnection): void {
    const activeSockets =
      this.socketsByUserId.get(connection.userId) ?? new Set<string>()
    activeSockets.add(connection.socketId)

    this.socketsByUserId.set(connection.userId, activeSockets)
    this.usernamesByUserId.set(connection.userId, connection.username)
  }

  removeConnection(disconnection: PresenceDisconnection): void {
    const activeSockets = this.socketsByUserId.get(disconnection.userId)
    if (!activeSockets) {
      return
    }

    activeSockets.delete(disconnection.socketId)
    if (activeSockets.size > 0) {
      return
    }

    this.socketsByUserId.delete(disconnection.userId)
    this.usernamesByUserId.delete(disconnection.userId)
  }

  getOnlineUsers(): OnlineUser[] {
    return Array.from(this.usernamesByUserId.entries())
      .map(([userId, username]) => ({
        userId,
        username,
      }))
      .sort((firstUser, secondUser) =>
        firstUser.username.localeCompare(secondUser.username),
      )
  }

  isUserOnline(userId: string): boolean {
    const sockets = this.socketsByUserId.get(userId)
    return sockets !== undefined && sockets.size > 0
  }

  getSocketIdsByUserId(userId: string): string[] {
    const sockets = this.socketsByUserId.get(userId)
    return sockets ? Array.from(sockets) : []
  }

  broadcastOnlineUsers(io: Server): void {
    io.emit('presence:online-users', {
      users: this.getOnlineUsers(),
    })
  }
}

export const presenceService = new PresenceService()
