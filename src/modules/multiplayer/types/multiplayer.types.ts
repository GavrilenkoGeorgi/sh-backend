// TODO: revise these types, they look similar
// shared multiplayer types matching the spec contract
export interface BasicUser {
  id: string
  username: string
}

export interface OnlineUser {
  userId: string
  username: string
}

// socket.data.user shape attached during authentication
export interface SocketUser {
  id: string
  username: string
}

// invite statuses
export type InviteStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'expired'

// client -> server payloads
export interface InviteSendPayload {
  toUserId: string
}

export interface InviteAcceptPayload {
  inviteId: string
}

export interface InviteDeclinePayload {
  inviteId: string
}

// server -> client payloads
export interface InviteReceivedPayload {
  inviteId: string
  fromUser: BasicUser
}

export interface InviteStatusPayload {
  inviteId: string
  status: 'accepted' | 'declined' | 'cancelled' | 'expired'
}

// rest bootstrap payloads
export interface OutgoingInvitePayload {
  inviteId: string
  toUser: BasicUser
}

// game statuses
export type MultiplayerGameStatus = 'active' | 'finished' | 'abandoned'

// game end reasons
export type GameEndReason = 'completed' | 'opponent_disconnected'

// category keys matching existing frontend scoring logic
export type SchoolCombination =
  | 'ones'
  | 'twos'
  | 'threes'
  | 'fours'
  | 'fives'
  | 'sixes'

export type GameCombination =
  | 'pair'
  | 'twoPairs'
  | 'triple'
  | 'full'
  | 'quads'
  | 'poker'
  | 'small'
  | 'large'
  | 'chance'

export type ScoreCategory = SchoolCombination | GameCombination

// per-player state in a multiplayer game
export interface MultiplayerPlayerState {
  totalScore: number
  usedCategories: ScoreCategory[]
  scoreCard: Record<ScoreCategory, number | null>
}

// turn move submitted by client
export interface TurnMoveInput {
  category: ScoreCategory
  score: number
  dice: number[]
}

// stored move history item
export interface TurnMoveRecord {
  playerId: string
  category: ScoreCategory
  score: number
  dice: number[]
  createdAt: string
}

// shared game state sent to frontend
export interface MultiplayerGameState {
  gameId: string
  status: MultiplayerGameStatus
  player1Id: string
  player2Id: string
  currentTurnPlayerId: string
  turnNumber: number
  players: Record<string, MultiplayerPlayerState>
  winnerId?: string | null
  endedReason?: 'completed' | 'disconnect'
}

// server -> client payloads for game lifecycle
export interface GameStartedPayload {
  gameId: string
  currentTurnPlayerId: string
  opponent: BasicUser
  gameState: MultiplayerGameState
}

export interface GameStateUpdatedPayload {
  gameId: string
  gameState: MultiplayerGameState
}

// client -> server payloads for game actions
export interface GameSubmitTurnPayload {
  gameId: string
  move: TurnMoveInput
}
