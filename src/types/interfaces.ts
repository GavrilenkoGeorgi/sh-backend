import { Request } from 'express'
import { JwtPayload } from 'jsonwebtoken'

export interface IReqWithUserData extends Request {
  user?: JwtPayload
}

export interface IResult {
  score: number
  favDiceValues: [number]
  stats: Object
}
