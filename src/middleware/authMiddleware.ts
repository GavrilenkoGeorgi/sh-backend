import jwt from 'jsonwebtoken'
import asyncHandler from 'express-async-handler' //?

import User from '../models/userModel.js'
import { type JwtPayload } from 'jsonwebtoken'
import { type ReqWithUserData, type JwtUser } from '../types/interfaces.js'

const protect = asyncHandler(async (req: ReqWithUserData, res, next) => {
  let token = req.cookies.accessToken

  if (token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || '',
      ) as JwtPayload
      // attach userData
      const user = await User.findById(decoded.id).select('-password')

      if (!user) {
        res.status(401)
        throw new Error('Not authorized, user not found.')
      }

      req.user = user

      next()
    } catch (error) {
      res.status(401)
      throw new Error('Not authorized, token failed.')
    }
  } else {
    res.status(401)
    throw new Error('Not authorized, no token.')
  }
})

export { protect }
