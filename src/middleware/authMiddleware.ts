import jwt from 'jsonwebtoken'

import User from '../models/userModel.js'
import { type JwtPayload } from 'jsonwebtoken'
import { type Response, type NextFunction } from 'express'
import { type ReqWithUserData } from '../types/interfaces.js'
import { USER_SAFE_FIELDS } from '../constants/db.js'

const protect = async (
  req: ReqWithUserData,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = req.cookies.accessToken

  if (!token) {
    res.status(401)
    return next(new Error('Not authorized, no token.'))
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || '',
    ) as JwtPayload

    const user = await User.findById(decoded.id).select(USER_SAFE_FIELDS)

    if (!user) {
      res.status(401)
      return next(new Error('Not authorized, user not found.'))
    }

    req.user = user
    next()
  } catch (err) {
    res.status(401)
    return next(err)
  }
}

export { protect }
