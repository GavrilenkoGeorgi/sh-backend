import { Schema, model } from 'mongoose'
import Result from './resultModel'
import Token from './tokenModel'

const UserSchema = new Schema({
  name: {type: String, required: true},
  email: {type: String, unique: true, required: true},
  password: {type: String, required: true},
  isActivated: {type: Boolean, default: false},
  activationLink: {type: String},
  passwordUpdateToken: {type: String},
  results: [{ type: Schema.Types.ObjectId, ref: 'Result'}]
})

UserSchema.post('findOneAndRemove', async function (doc) {
  // remove access token
  await Token.findOneAndRemove({ user: doc._id })
  // remove results
  if (doc.results.length > 0) {
    for (let id of doc.results ) {
      await Result.findByIdAndDelete(id)
    }
  }
})

export default model('User', UserSchema)
