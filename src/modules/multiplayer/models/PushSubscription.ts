import { Schema, model, type Document } from 'mongoose'

export interface PushSubscriptionDocument extends Document {
  userId: string
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  userAgent?: string
  createdAt: Date
  updatedAt: Date
}

const PushSubscriptionSchema = new Schema<PushSubscriptionDocument>(
  {
    userId: { type: String, required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String },
  },
  { timestamps: true },
)

export default model<PushSubscriptionDocument>(
  'PushSubscription',
  PushSubscriptionSchema,
)
