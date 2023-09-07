import { Request } from 'express'
import { JwtPayload } from 'jsonwebtoken'

export interface IReqWithUserData extends Request {
  user?: JwtPayload
}
