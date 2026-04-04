import { Server, type Socket } from 'socket.io'

import type {
  SocketUser,
  ScoreCategory,
} from '../../modules/multiplayer/types/multiplayer.types'
import { gameService } from '../../modules/multiplayer/services/game.service'

export function registerGameHandlers(io: Server, socket: Socket): void {
  const authenticatedUser = socket.data.user as SocketUser

  socket.on('game:submit-turn', async (payload, callback) => {
    try {
      const gameId =
        typeof payload?.gameId === 'string' ? payload.gameId.trim() : ''

      if (!gameId) {
        return emitActionError(
          socket,
          callback,
          'Invalid payload: gameId is required',
        )
      }

      const move = payload?.move
      if (!move || typeof move !== 'object') {
        return emitActionError(
          socket,
          callback,
          'Invalid payload: move is required',
        )
      }

      const category =
        typeof move.category === 'string' ? move.category.trim() : ''
      if (!category) {
        return emitActionError(
          socket,
          callback,
          'Invalid payload: move.category is required',
        )
      }

      const result = await gameService.submitTurn(
        gameId,
        authenticatedUser.id,
        {
          category: category as ScoreCategory,
          score: move.score,
          dice: move.dice,
        },
      )

      const gameRoom = `game:${gameId}`

      // always broadcast updated game state to both players
      io.to(gameRoom).emit('game:state-updated', result.stateUpdated)

      // if the game ended, emit game:ended to both players
      if (result.gameEnded) {
        io.to(gameRoom).emit('game:ended', result.gameEnded)
      }

      if (typeof callback === 'function') {
        callback({ success: true })
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to submit turn'
      emitActionError(socket, callback, message)
    }
  })
}

function emitActionError(
  socket: Socket,
  callback: unknown,
  message: string,
): void {
  if (typeof callback === 'function') {
    callback({ error: message })
  }

  socket.emit('game:error', { message })
}
