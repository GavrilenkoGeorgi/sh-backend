import { Schema, model, type Document } from 'mongoose'
import { type InviteStatus } from '../types/multiplayer.types'

export interface InviteDocument extends Document {
  fromUserId: string
  toUserId: string
  status: InviteStatus
  createdAt: Date
  updatedAt: Date
}

const InviteSchema = new Schema<InviteDocument>(
  {
    fromUserId: { type: String, required: true },
    toUserId: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'cancelled', 'expired'],
      default: 'pending',
      required: true,
    },
  },
  { timestamps: true },
)

// fast lookup for duplicate pending invites between a pair of users
InviteSchema.index(
  { fromUserId: 1, toUserId: 1, status: 1 },
  {
    partialFilterExpression: { status: 'pending' },
  },
)

// fast lookup for pending invites targeting a specific user
InviteSchema.index({ toUserId: 1, status: 1 })

// fast lookup for pending invites sent by a specific user
InviteSchema.index({ fromUserId: 1, status: 1 })

export default model<InviteDocument>('Invite', InviteSchema)
