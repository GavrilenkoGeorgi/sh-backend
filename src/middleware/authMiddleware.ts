import jwt from 'jsonwebtoken'
import asyncHandler from 'express-async-handler' //?

import User from '../models/userModel.js'
import { type JwtPayload } from 'jsonwebtoken'
import { type IReqWithUserData } from '../types/interfaces.js'

const protect = asyncHandler(async (req: IReqWithUserData, res, next) => {

  let token = req.cookies.accessToken

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as JwtPayload
      // attach userData
      req.user = await User.findById(decoded.id).select('-password')
      next()
    } catch (error) {
      console.error(error)
      res.status(401)
      throw new Error('Not authorized, token failed')
    }
  } else {
    res.status(401)
    throw new Error('Not authorized, no token')
  }
})

export { protect }
