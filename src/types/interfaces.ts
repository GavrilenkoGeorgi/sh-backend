import { Request } from 'express'

export interface IReqWithUserData extends Request {
  user?: {
    _id: string
  }
}
