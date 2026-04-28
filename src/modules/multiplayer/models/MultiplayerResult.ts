import { Schema, model, type Document, type Types } from 'mongoose'

import type { ScoreCategory, GameEndReason } from '../types/multiplayer.types'

export type MultiplayerResultOutcome = 'win' | 'loss' | 'tie'

export interface MultiplayerResultDocument extends Document {
  multiplayerGameId: Types.ObjectId
  playerId: string
  opponentId: string
  outcome: MultiplayerResultOutcome
  reason: GameEndReason
  finalScore: number
  opponentScore: number
  scoreCard: Record<ScoreCategory, number | null>
  usedCategories: ScoreCategory[]
  turnNumber: number
  createdAt: Date
  updatedAt: Date
}

const MultiplayerResultSchema = new Schema<MultiplayerResultDocument>(
  {
    multiplayerGameId: {
      type: Schema.Types.ObjectId,
      ref: 'MultiplayerGame',
      required: true,
    },
    playerId: { type: String, required: true },
    opponentId: { type: String, required: true },
    outcome: {
      type: String,
      enum: ['win', 'loss', 'tie'],
      required: true,
    },
    reason: {
      type: String,
      enum: ['completed', 'opponent_disconnected', 'school_incomplete'],
      required: true,
    },
    finalScore: { type: Number, required: true },
    opponentScore: { type: Number, required: true },
    scoreCard: {
      type: Schema.Types.Mixed,
      required: true,
    },
    usedCategories: { type: [String], required: true, default: [] },
    turnNumber: { type: Number, required: true },
  },
  { timestamps: true },
)

// guarantee one multiplayer result per player per game
MultiplayerResultSchema.index(
  { multiplayerGameId: 1, playerId: 1 },
  { unique: true },
)

// helpful for user history queries
MultiplayerResultSchema.index({ playerId: 1, createdAt: -1 })

export default model<MultiplayerResultDocument>(
  'MultiplayerResult',
  MultiplayerResultSchema,
)
