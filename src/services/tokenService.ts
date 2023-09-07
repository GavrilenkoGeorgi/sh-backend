import jwt from 'jsonwebtoken'

import tokenModel from '../models/tokenModel'
import { tokenPayload, tokenData } from '../types'

class TokenService {
  generateTokens(payload: tokenPayload) {
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET || '', { expiresIn: '7d' })
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH || '', { expiresIn: '14d' })

    return {
      accessToken,
      refreshToken
    }
  }

  validateAccessToken(token: string) {
    try {
      const userData = jwt.verify(token, process.env.JWT_SECRET || '')
      return userData
    } catch (err) {
      return null
    }
  }

  validateRefreshToken(token: string) {
    try {
      const userData = jwt.verify(token, process.env.JWT_REFRESH || '')
      return userData
    } catch (err) {
      return null
    }
  }

  async saveToken(userId: string, refreshToken: string) {
    const tokenData = await tokenModel.findOne({ user: userId }) as tokenData
    if (tokenData) {
      tokenData.refreshToken = refreshToken
      return tokenData.save()
    }

    const token = await tokenModel.create({ user: userId, refreshToken })
    return token
  }

  async removeToken(refreshToken: string) {
    const tokenData = await tokenModel.deleteOne({ refreshToken })
    return tokenData
  }

  async findToken(refreshToken: string) {
    const tokenData = await tokenModel.findOne({ refreshToken }) // as tokenData
    return tokenData
  }
}

export default new TokenService()
