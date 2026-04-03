import MultiplayerGame from '../models/MultiplayerGame'
import User from '../../../models/userModel'

import type {
  ScoreCategory,
  MultiplayerPlayerState,
  MultiplayerGameState,
  GameStartedPayload,
  GameStateUpdatedPayload,
  TurnMoveInput,
  BasicUser,
} from '../types/multiplayer.types'

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

  async submitTurn(
    gameId: string,
    playerId: string,
    move: TurnMoveInput,
  ): Promise<GameStateUpdatedPayload> {
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

    // switch turn to the other player and increment turn number
    const otherPlayerId = isPlayer1 ? game.player2Id : game.player1Id
    game.currentTurnPlayerId = otherPlayerId
    game.turnNumber += 1

    game.markModified('players')
    await game.save()

    // build plain players object from the mongoose map
    const players: Record<string, MultiplayerPlayerState> = {}
    for (const [key, value] of game.players.entries()) {
      players[key] = {
        totalScore: value.totalScore,
        usedCategories: [...value.usedCategories],
        scoreCard: { ...value.scoreCard },
      }
    }

    const gameState: MultiplayerGameState = {
      gameId: game._id.toString(),
      status: game.status,
      player1Id: game.player1Id,
      player2Id: game.player2Id,
      currentTurnPlayerId: game.currentTurnPlayerId,
      turnNumber: game.turnNumber,
      players,
    }

    return { gameId: gameState.gameId, gameState }
  }
}

export const gameService = new GameService()
