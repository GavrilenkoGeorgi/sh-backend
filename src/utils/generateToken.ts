import { Response } from 'express'
import jwt from 'jsonwebtoken'

const generateToken = (res: Response, userId: string) => {

  const token = jwt.sign({ userId }, process.env.JWT_SECRET || '', {
    expiresIn: '14d'
  })

  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH || '', {
    expiresIn: '28d'
  })

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development', // Use secure cookies in production
    sameSite: 'strict', // Prevent CSRF attacks
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  })

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development', // Use secure cookies in production
    sameSite: 'strict', // Prevent CSRF attacks
    maxAge: 2*60*60*1000
  })
}

export default generateToken
