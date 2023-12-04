import { Request } from 'express'
import { JwtPayload } from 'jsonwebtoken'
import { Document } from 'mongoose'

export interface ReqWithUserData extends Request {
  user?: JwtPayload
}

export interface Stats {
  pair: number
  twoPairs: number
  triple: number
  full: number
  quads: number
  poker: number
  small: number
  large: number
}

export interface IResult extends Document {
  score: number
  schoolScore: number
  favDiceValues: [number]
  stats: Stats
}

export interface ChartAxisData {
  id: string
  value: number
}

export interface DiceStats {
  ones: number
  twos: number
  threes: number
  fours: number
  fives: number
  sixes: number
}
