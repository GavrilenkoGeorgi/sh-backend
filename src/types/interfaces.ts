import { Request } from 'express'
import { JwtPayload } from 'jsonwebtoken'
import { Document } from 'mongoose'

export interface IReqWithUserData extends Request {
  user?: JwtPayload
}

export interface IResult extends Document {
  score: number
  favDiceValues: [number]
  stats: Object
}
