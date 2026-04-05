import MultiplayerGame, {
  type MultiplayerGameDocument,
} from '../models/MultiplayerGame'
import MultiplayerResult from '../models/MultiplayerResult'
import User from '../../../models/userModel'

import type {
  ScoreCategory,
  MultiplayerPlayerState,
  MultiplayerGameState,
  GameStartedPayload,
  GameStateUpdatedPayload,
  GameEndedPayload,
  GameEndReason,
  TurnMoveInput,
  BasicUser,
} from '../types/multiplayer.types'

export interface SubmitTurnResult {
  stateUpdated: GameStateUpdatedPayload
  gameEnded: GameEndedPayload | null
}

const ALL_CATEGORIES: ScoreCategory[] = [
  'ones',
  'twos',
  'threes',
  'fours',
  'fives',
  'sixes',
  'pair',
  'twoPairs',
  'triple',
  'full',
  'quads',
  'poker',
  'small',
  'large',
  'chance',
]

const VALID_CATEGORIES_SET = new Set<string>(ALL_CATEGORIES)

const SCORE_RANGES: Record<ScoreCategory, { min: number; max: number }> = {
  ones: { min: -2, max: 2 },
  twos: { min: -4, max: 4 },
  threes: { min: -6, max: 6 },
  fours: { min: -8, max: 8 },
  fives: { min: -10, max: 10 },
  sixes: { min: -12, max: 12 },
  pair: { min: 0, max: 12 },
  twoPairs: { min: 0, max: 22 },
  triple: { min: 0, max: 18 },
  full: { min: 0, max: 28 },
  quads: { min: 0, max: 24 },
  poker: { min: 0, max: 110 },
  small: { min: 0, max: 15 },
  large: { min: 0, max: 20 },
  chance: { min: 0, max: 30 }, // need to decide if we want 1 as minimum
}

function createEmptyPlayerState(): MultiplayerPlayerState {
  const scoreCard = {} as Record<ScoreCategory, number | null>
  for (const category of ALL_CATEGORIES) {
    scoreCard[category] = null
  }

  return {
    totalScore: 0,
    usedCategories: [],
    scoreCard,
  }
}

class GameService {
  async createGame(
    player1Id: string,
    player2Id: string,
  ): Promise<{
    gameState: MultiplayerGameState
    usernames: Map<string, string>
  }> {
    const players: Record<string, MultiplayerPlayerState> = {
      [player1Id]: createEmptyPlayerState(),
      [player2Id]: createEmptyPlayerState(),
    }

    const game = await MultiplayerGame.create({
      status: 'active',
      player1Id,
      player2Id,
      currentTurnPlayerId: player2Id, // invited user starts first
      players,
      turnNumber: 1,
      moves: [],
    })

    const userIds = [player1Id, player2Id]
    const users = await User.find({ _id: { $in: userIds } })
      .select('name')
      .lean()

    const usernames = new Map<string, string>(
      users.map((user) => [user._id.toString(), user.name]),
    )

    const gameState: MultiplayerGameState = {
      gameId: game._id.toString(),
      status: 'active',
      player1Id,
      player2Id,
      currentTurnPlayerId: player2Id,
      turnNumber: 1,
      players,
    }

    return { gameState, usernames }
  }

  buildGameStartedPayload(
    gameState: MultiplayerGameState,
    forPlayerId: string,
    opponentId: string,
    usernames: Map<string, string>,
  ): GameStartedPayload {
    const opponent: BasicUser = {
      id: opponentId,
      username: usernames.get(opponentId) ?? 'Unknown',
    }

    return {
      gameId: gameState.gameId,
      currentTurnPlayerId: gameState.currentTurnPlayerId,
      opponent,
      gameState,
    }
  }

  async endActiveGamesForDisconnectedUser(
    disconnectedUserId: string,
  ): Promise<Array<{ remainingUserId: string; payload: GameEndedPayload }>> {
    const activeGames = await MultiplayerGame.find({
      status: 'active',
      $or: [
        { player1Id: disconnectedUserId },
        { player2Id: disconnectedUserId },
      ],
    })

    const endedGames: Array<{
      remainingUserId: string
      payload: GameEndedPayload
    }> = []

    for (const game of activeGames) {
      const remainingUserId =
        game.player1Id === disconnectedUserId ? game.player2Id : game.player1Id

      game.status = 'abandoned'
      game.endedReason = 'disconnect'
      game.winnerId = remainingUserId

      await game.save()
      await this.persistResultsForEndedGame(game, 'opponent_disconnected')

      const gameState = this.buildGameState(game)

      endedGames.push({
        remainingUserId,
        payload: {
          gameId: gameState.gameId,
          reason: 'opponent_disconnected',
          winnerId: game.winnerId,
          gameState,
        },
      })
    }

    return endedGames
  }

  async submitTurn(
    gameId: string,
    playerId: string,
    move: TurnMoveInput,
  ): Promise<SubmitTurnResult> {
    const game = await MultiplayerGame.findById(gameId)
    if (!game) {
      throw new Error('Game not found')
    }

    if (game.status !== 'active') {
      throw new Error('Game is not active')
    }

    const isPlayer1 = game.player1Id === playerId
    const isPlayer2 = game.player2Id === playerId
    if (!isPlayer1 && !isPlayer2) {
      throw new Error('You are not a player in this game')
    }

    if (game.currentTurnPlayerId !== playerId) {
      throw new Error('It is not your turn')
    }

    // validate category
    if (!VALID_CATEGORIES_SET.has(move.category)) {
      throw new Error('Invalid category')
    }

    // mongoose stores players as a Map, so use .get()
    const playerState = game.players.get(playerId)
    if (!playerState) {
      throw new Error('Player state not found')
    }

    if (playerState.usedCategories.includes(move.category)) {
      throw new Error('Category already used')
    }

    // validate dice shape
    if (
      !Array.isArray(move.dice) ||
      move.dice.length < 1 ||
      move.dice.length > 5
    ) {
      throw new Error('Dice must contain between 1 and 5 values')
    }

    for (const die of move.dice) {
      if (!Number.isInteger(die) || die < 1 || die > 6) {
        throw new Error('Each die value must be an integer between 1 and 6')
      }
    }

    // validate score
    if (typeof move.score !== 'number' || !Number.isFinite(move.score)) {
      throw new Error('Score must be a finite number')
    }

    const range = SCORE_RANGES[move.category]
    if (move.score < range.min || move.score > range.max) {
      throw new Error(
        `Score ${move.score} is out of range for ${move.category} (${range.min} to ${range.max})`,
      )
    }

    // apply the turn
    playerState.scoreCard[move.category] = move.score
    playerState.usedCategories.push(move.category)

    // recompute total score from scorecard for safety
    let totalScore = 0
    for (const category of ALL_CATEGORIES) {
      const value = playerState.scoreCard[category]
      if (value !== null && value !== undefined) {
        totalScore += value
      }
    }
    playerState.totalScore = totalScore

    // save updated player state back to the map
    game.players.set(playerId, playerState)

    // append move record
    game.moves.push({
      playerId,
      category: move.category,
      score: move.score,
      dice: move.dice,
      createdAt: new Date().toISOString(),
    })

    // check if the game is complete (both players used all categories)
    const otherPlayerId = isPlayer1 ? game.player2Id : game.player1Id
    const otherPlayerState = game.players.get(otherPlayerId)

    const currentPlayerDone =
      playerState.usedCategories.length === ALL_CATEGORIES.length
    const otherPlayerDone =
      otherPlayerState?.usedCategories.length === ALL_CATEGORIES.length

    let gameEnded: GameEndedPayload | null = null

    if (currentPlayerDone && otherPlayerDone) {
      // game is complete
      game.status = 'finished'
      game.endedReason = 'completed'

      const otherTotal = otherPlayerState?.totalScore ?? 0
      if (playerState.totalScore > otherTotal) {
        game.winnerId = playerId
      } else if (otherTotal > playerState.totalScore) {
        game.winnerId = otherPlayerId
      } else {
        game.winnerId = null // tie
      }
    } else {
      // switch turn to the other player and increment turn number
      game.currentTurnPlayerId = otherPlayerId
      game.turnNumber += 1
    }

    game.markModified('players')
    await game.save()

    if (game.status === 'finished') {
      await this.persistResultsForEndedGame(game, 'completed')
    }

    const gameState = this.buildGameState(game)

    if (game.status === 'finished') {
      gameEnded = {
        gameId: gameState.gameId,
        reason: 'completed',
        winnerId: game.winnerId,
        gameState,
      }
    }

    return {
      stateUpdated: { gameId: gameState.gameId, gameState },
      gameEnded,
    }
  }

  private async persistResultsForEndedGame(
    game: MultiplayerGameDocument,
    reason: GameEndReason,
  ): Promise<void> {
    const player1State = game.players.get(game.player1Id)
    const player2State = game.players.get(game.player2Id)

    if (!player1State || !player2State) {
      throw new Error(
        'Cannot persist multiplayer results: missing player state',
      )
    }

    const playersToPersist = [
      {
        playerId: game.player1Id,
        opponentId: game.player2Id,
        playerState: player1State,
        opponentState: player2State,
      },
      {
        playerId: game.player2Id,
        opponentId: game.player1Id,
        playerState: player2State,
        opponentState: player1State,
      },
    ]

    for (const playerToPersist of playersToPersist) {
      const outcome = this.resolveOutcome(
        game.winnerId,
        playerToPersist.playerId,
      )

      const persistedResult = await MultiplayerResult.findOneAndUpdate(
        {
          multiplayerGameId: game._id,
          playerId: playerToPersist.playerId,
        },
        {
          $setOnInsert: {
            multiplayerGameId: game._id,
            playerId: playerToPersist.playerId,
            opponentId: playerToPersist.opponentId,
            outcome,
            reason,
            finalScore: playerToPersist.playerState.totalScore,
            opponentScore: playerToPersist.opponentState.totalScore,
            scoreCard: { ...playerToPersist.playerState.scoreCard },
            usedCategories: [...playerToPersist.playerState.usedCategories],
            turnNumber: game.turnNumber,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      )

      if (!persistedResult) {
        throw new Error('Failed to persist multiplayer result')
      }

      const updatedUser = await User.findByIdAndUpdate(
        playerToPersist.playerId,
        {
          $addToSet: {
            multiplayerResults: persistedResult._id,
          },
        },
      )

      if (!updatedUser) {
        throw new Error(
          `Failed to link multiplayer result to user ${playerToPersist.playerId}`,
        )
      }
    }
  }

  private resolveOutcome(
    winnerId: string | null | undefined,
    playerId: string,
  ): 'win' | 'loss' | 'tie' {
    if (!winnerId) {
      return 'tie'
    }

    return winnerId === playerId ? 'win' : 'loss'
  }

  private buildGameState(game: MultiplayerGameDocument): MultiplayerGameState {
    // build plain players object from the mongoose map
    const players: Record<string, MultiplayerPlayerState> = {}
    for (const [key, value] of game.players.entries()) {
      players[key] = {
        totalScore: value.totalScore,
        usedCategories: [...value.usedCategories],
        scoreCard: { ...value.scoreCard },
      }
    }

    return {
      gameId: game._id.toString(),
      status: game.status,
      player1Id: game.player1Id,
      player2Id: game.player2Id,
      currentTurnPlayerId: game.currentTurnPlayerId,
      turnNumber: game.turnNumber,
      players,
      winnerId: game.winnerId,
      endedReason: game.endedReason,
    }
  }
}

export const gameService = new GameService()
