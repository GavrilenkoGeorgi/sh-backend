import { Request } from 'express'
import { JwtPayload } from 'jsonwebtoken'

export interface IReqWithUserData extends Request {
  user?: JwtPayload
}

export interface IGameResults {
  score: number
  favDiceValues: [number]
  stats: Object
  userId: string
}
