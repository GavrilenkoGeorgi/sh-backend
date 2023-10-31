import { Request } from 'express'
import { JwtPayload } from 'jsonwebtoken'
import { Document } from 'mongoose'

export interface IReqWithUserData extends Request {
  user?: JwtPayload
}

export interface ICombination {
  pair: number
  twoPairs: number
  triple: number
  full: number
  quads: number
  poker: number
  small: number
  large: number
  chance: number
}

export interface IResult extends Document {
  score: number
  schoolScore: number
  favDiceValues: [number]
  stats: ICombination
}
