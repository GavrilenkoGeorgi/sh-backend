import { Schema, model, type Document } from 'mongoose'

import type {
  MultiplayerGameStatus,
  MultiplayerPlayerState,
  TurnMoveRecord,
} from '../types/multiplayer.types'

export interface MultiplayerGameDocument extends Document {
  status: MultiplayerGameStatus
  player1Id: string
  player2Id: string
  currentTurnPlayerId: string
  players: Map<string, MultiplayerPlayerState>
  turnNumber: number
  moves: TurnMoveRecord[]
  winnerId?: string | null
  endedReason?: 'completed' | 'disconnect' | 'school-incomplete'
  createdAt: Date
  updatedAt: Date
}

const MultiplayerPlayerStateSchema = new Schema(
  {
    totalScore: { type: Number, required: true, default: 0 },
    usedCategories: { type: [String], required: true, default: [] },
    scoreCard: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: false },
)

const TurnMoveRecordSchema = new Schema(
  {
    playerId: { type: String, required: true },
    category: { type: String, required: true },
    score: { type: Number, required: true },
    dice: { type: [Number], required: true },
    createdAt: { type: String, required: true },
  },
  { _id: false },
)

const MultiplayerGameSchema = new Schema<MultiplayerGameDocument>(
  {
    status: {
      type: String,
      enum: ['active', 'finished', 'abandoned'],
      default: 'active',
      required: true,
    },
    player1Id: { type: String, required: true },
    player2Id: { type: String, required: true },
    currentTurnPlayerId: { type: String, required: true },
    players: {
      type: Map,
      of: MultiplayerPlayerStateSchema,
      required: true,
    },
    turnNumber: { type: Number, required: true, default: 1 },
    moves: { type: [TurnMoveRecordSchema], required: true, default: [] },
    winnerId: { type: String, default: null },
    endedReason: {
      type: String,
      enum: ['completed', 'disconnect', 'school-incomplete'],
      default: undefined,
    },
  },
  { timestamps: true },
)

// fast lookup for active games by player
MultiplayerGameSchema.index(
  { player1Id: 1, status: 1 },
  { partialFilterExpression: { status: 'active' } },
)
MultiplayerGameSchema.index(
  { player2Id: 1, status: 1 },
  { partialFilterExpression: { status: 'active' } },
)

export default model<MultiplayerGameDocument>(
  'MultiplayerGame',
  MultiplayerGameSchema,
)
