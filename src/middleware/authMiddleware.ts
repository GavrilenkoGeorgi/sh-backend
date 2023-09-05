import jwt from 'jsonwebtoken'
import asyncHandler from 'express-async-handler'
import User from '../models/userModel.js'

import { IReqWithUserData } from '../types/interfaces.js'

const protect = asyncHandler(async (req: IReqWithUserData, res, next) => {
  let token;

  token = req.cookies.jwt;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || '')

      console.log('Decoded ', decoded)

      // @ts-ignore
      req.user = await User.findById(decoded.userId).select('-password')

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
