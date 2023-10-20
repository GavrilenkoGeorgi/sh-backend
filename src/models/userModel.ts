import { Schema, model } from 'mongoose'

const UserSchema = new Schema({
  name: {type: String, required: true},
  email: {type: String, unique: true, required: true},
  password: {type: String, required: true},
  isActivated: {type: Boolean, default: false},
  activationLink: {type: String},
  results: [{ type: Schema.Types.ObjectId, ref: 'Result'}]
})

export default model('User', UserSchema)
