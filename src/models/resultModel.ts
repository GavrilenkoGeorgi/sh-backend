import { Schema, model } from 'mongoose'
import { IResult } from '../types/interfaces'

const ResultSchema = new Schema<IResult>({
  score: {type: Number, required: true},
  schoolScore: {type: Number, required: true},
  favDiceValues: {type: [Number], requred: true},
  stats: {
    pair: { type: Number, default: 0 },
    twoPairs: { type: Number, default: 0 },
    triple: { type: Number, default: 0 },
    full: { type: Number, default: 0 },
    quads:{ type: Number, default: 0 },
    poker: { type: Number, default: 0 },
    small: { type: Number, default: 0 },
    large: { type: Number, default: 0 },
    chance: { type: Number, default: 0 }
  }
})

export default model('Result', ResultSchema)
