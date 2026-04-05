import {
  Schema,
  model,
  HydratedDocument,
  InferSchemaType,
  Types,
  Model,
} from 'mongoose'
import Result from './resultModel'
import Token from './tokenModel'
import MultiplayerResult from '../modules/multiplayer/models/MultiplayerResult'

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    isActivated: { type: Boolean, default: false },
    activationLink: { type: String },
    passwordUpdateToken: { type: String },
    results: [{ type: Schema.Types.ObjectId, ref: 'Result' }],
    multiplayerResults: [
      { type: Schema.Types.ObjectId, ref: 'MultiplayerResult' },
    ],
  },
  {
    timestamps: true,
  },
)

// raw document shape, before Mongoose document methods)
export type User = InferSchemaType<typeof UserSchema>

// full Mongoose document type (recommended for req.user, query results, etc.)
export type UserDocument = HydratedDocument<User>

// optional explicit model type
export type UserModel = Model<User>

// cleanup after user deletion via findOneAndDelete / findByIdAndDelete
UserSchema.post('findOneAndDelete', async function (doc: UserDocument | null) {
  if (!doc) return

  // remove token(s) linked to this user
  await Token.findOneAndDelete({ user: doc._id })

  // remove related results
  if (doc.results.length > 0) {
    await Result.deleteMany({
      _id: { $in: doc.results as Types.ObjectId[] },
    })
  }

  // remove related multiplayer results
  if (doc.multiplayerResults.length > 0) {
    await MultiplayerResult.deleteMany({
      _id: { $in: doc.multiplayerResults as Types.ObjectId[] },
    })
  }
})

const UserModel = model<User>('User', UserSchema)

export default UserModel
