import jwt from 'jsonwebtoken'

import tokenModel from '../models/tokenModel'
import { tokenPayload, tokenData, recoveryTokenData } from '../types'

class TokenService {
  generateTokens(payload: tokenPayload) {
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET || '', { expiresIn: '7d' })
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH || '', { expiresIn: '14d' })

    return {
      accessToken,
      refreshToken
    }
  }

  generateRecoveryToken(payload: recoveryTokenData) {
    const recoveryToken = jwt.sign(payload, process.env.JWT_SECRET || '', { expiresIn: '1d' })
    return recoveryToken
  }

  validatePasswordToken(token: string) {
    const data = jwt.verify(token, process.env.JWT_SECRET || '')
    return data
  }

  validateAccessToken(token: string) {
    const userData = jwt.verify(token, process.env.JWT_SECRET || '')
    return userData
  }

  validateRefreshToken(token: string) {
    const userData = jwt.verify(token, process.env.JWT_REFRESH || '')
    return userData
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
