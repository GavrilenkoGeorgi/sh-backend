import userModel from '../models/userModel'
import bcrypt from 'bcryptjs'
import * as uuid from 'uuid'

import tokenService from './tokenService'
import mailService from './mailService'
import { LoginCreds, profileUpdateData } from '../types'
import { buildUserUrl, USER_ROUTES } from '../constants/routes'
import { SALT_ROUNDS } from '../constants'
import { USER_SAFE_FIELDS } from '../constants/db'

class UserService {
  async registration({ name, email, password }: LoginCreds) {
    const existingUser = await userModel.findOne({ email })
    if (existingUser) {
      throw new Error('User already exists.')
    }

    const hashPassword = await bcrypt.hash(password, SALT_ROUNDS)
    const activationLink = uuid.v4()
    const user = await userModel.create({
      name,
      email,
      password: hashPassword,
      activationLink,
    })
    await mailService.sendActivationEmail(
      email,
      `${process.env.API_URL}${buildUserUrl(USER_ROUTES.ACTIVATE, {
        link: activationLink,
      })}`,
    )

    return user
  }

  async activate(activationLink: string) {
    const user = await userModel.findOne({ activationLink })

    if (!user) {
      throw new Error('Invalid activation link.')
    }

    user.isActivated = true
    user.activationLink = ''
    await user.save()
  }

  async login({ email, password }: LoginCreds) {
    const user = await userModel.findOne({ email })

    if (!user) {
      throw new Error("Can't login, check creds.")
    }

    if (!user.isActivated) {
      throw new Error('Check activation status.')
    }

    const checkPassword = await bcrypt.compare(password, user.password)
    if (!checkPassword) {
      throw new Error("Can't login, check creds.")
    }

    const tokens = tokenService.generateTokens({
      email: user.email,
      id: user.id,
      isActivated: user.isActivated,
    })

    await tokenService.saveToken(user.id, tokens.refreshToken)
    const safeUser = await userModel.findById(user.id).select(USER_SAFE_FIELDS)
    return { ...tokens, user: safeUser }
  }

  async logout(refreshToken: string) {
    const token = await tokenService.removeToken(refreshToken)
    return token
  }

  async refresh(refreshToken: string) {
    const payload = tokenService.validateRefreshToken(refreshToken)
    if (!payload) {
      throw new Error('Refresh token invalid or expired.')
    }

    const tokenRecord = await tokenService.findToken(refreshToken)
    if (!tokenRecord) {
      throw new Error('Refresh token not found in storage.')
    }

    const user = await userModel
      .findById(tokenRecord.user)
      .select(USER_SAFE_FIELDS)
    if (!user) {
      await tokenService.removeToken(refreshToken)
      throw new Error('User not found.')
    }

    const tokens = tokenService.generateTokens({
      email: user.email,
      id: user.id,
      isActivated: user.isActivated,
    })

    await tokenService.saveToken(user.id, tokens.refreshToken)

    return { ...tokens, user }
  }

  async getAllUsers() {
    const users = await userModel.find()
    return users
  }

  async getUserProfile(id: string) {
    const user = await userModel.findById(id).select(USER_SAFE_FIELDS)
    return user
  }

  async updateUserProfile(id: string, userData: profileUpdateData) {
    const filter = { _id: id }
    const update = {
      name: userData.name,
      email: userData.email,
    }

    let profile = await userModel
      .findOneAndUpdate(filter, update, {
        returnOriginal: false,
      })
      .select(USER_SAFE_FIELDS)

    return profile
  }

  async forgotPwd(email: string) {
    const existingUser = await userModel.findOne({ email })
    if (!existingUser) {
      throw new Error('Something went wrong in the piping system.') // security reasons
    }

    try {
      const token = tokenService.generateRecoveryToken({ email })
      await mailService.sendRecoveryEmail(
        email,
        `${process.env.CLIENT_URL}/forgotpwd?token=${token}`,
      )

      await userModel.findOneAndUpdate(
        { email },
        { passwordUpdateToken: token },
      )

      return `Recovery email sent to ${email}`
    } catch (error) {
      console.error('Error in forgotPwd:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      if (errorMessage.includes('Username and Password not accepted')) {
        throw new Error(
          'Email service is temporarily unavailable. Please contact support.',
        )
      }

      throw new Error('Failed to send recovery email. Please try again later.')
    }
  }

  async updatePwd(password: string, token: string) {
    const validToken = tokenService.validatePasswordToken(token)
    if (!validToken) {
      throw new Error('Invalid token.')
    }

    const user = await userModel.findOne({ passwordUpdateToken: token })
    if (!user) {
      throw new Error("Can't update, check token.")
    }

    const hashPassword = await bcrypt.hash(password, SALT_ROUNDS)
    user.password = hashPassword
    user.passwordUpdateToken = ''

    await user.save()
    return user
  }

  async delete(id: string) {
    if (!id) throw new Error('Check id.')
    await userModel.findOneAndDelete({ _id: id })
    return `Deleted acc id: ${id}`
  }

  async checkAuthStatus(token: string) {
    if (!token) {
      throw new Error('Invalid refresh token.')
    }

    const { id } = tokenService.validateAccessToken(token)
    const user = await userModel.findById(id).select(USER_SAFE_FIELDS)

    if (user) {
      return { isAuthenticated: true, user }
    } else {
      throw new Error('Unauthorised. User not found.')
    }
  }
}

export default new UserService()
