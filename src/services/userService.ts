import userModel from '../models/userModel'
import bcrypt from 'bcryptjs'
import * as uuid from 'uuid'

import tokenService from './tokenService'
import mailService from './mailService'
import { credProps, profileUpdateData } from '../types'

class UserService {

  async registration({ name, email, password }: credProps) {
    const existingUser = await userModel.findOne({ email })
    if (existingUser) {
      throw new Error('User already exists.')
    }

    const hashPassword = await bcrypt.hash(password, 7)
    const activationLink = uuid.v4()
    const user = await userModel.create({ name, email, password: hashPassword, activationLink })
    await mailService.sendActivationEmail(email, `${process.env.API_URL}/users/activate/${activationLink}`)

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

  async login({ email, password }: credProps) {
    const user = await userModel.findOne({ email })

    if (!user) {
      throw new Error('User not found.')
    }

    if (!user.isActivated) {
      throw new Error('User is not activated.')
    }

    const checkPassword = await bcrypt.compare(password, user.password)
    if (!checkPassword) {
      throw new Error('Password is incorrect.')
    }

    const tokens = tokenService.generateTokens({
      email: user.email,
      id: user.id,
      isActivated: user.isActivated.toString()
    })

    await tokenService.saveToken(user.id, tokens.refreshToken)
    return { ...tokens, user }
  }

  async logout(refreshToken: string) {
    const token = await tokenService.removeToken(refreshToken)
    return token
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new Error('Invalid refresh token.')
    }

    const userData = tokenService.validateRefreshToken(refreshToken)
    const tokenFromDb = await tokenService.findToken(refreshToken)

    if (!userData || !tokenFromDb) {
      throw new Error('Unauthorised.')
    }

    const user = await userModel.findById(tokenFromDb.user?.toString())
    if (user) {
      const tokens = tokenService.generateTokens({
        email: user.email,
        id: user.id,
        isActivated: user.isActivated.toString()
      })

      await tokenService.saveToken(user.id, tokens.refreshToken)

      return { ...tokens, user }
    } else {
      throw new Error('Can\'t generate tokens.' )
    }
  }

  async getAllUsers() {
    const users = await userModel.find()
    return users
  }

  async getUserProfile(id: string) {
    const user = await userModel.findById(id).select('-password')
    return user
  }

  async updateUserProfile(id: string, userData: profileUpdateData) {

    const filter = { _id: id }
    const update = {
      name: userData.name,
      email: userData.email
    }

    let profile = await userModel.findOneAndUpdate(filter, update, {
      returnOriginal: false
    }).select('-password')

    return profile
  }

  async forgotPwd(email: string) {

    const existingUser = await userModel.findOne({ email })
    if (!existingUser) {
      throw new Error('Something went wrong in the piping system.') // security reasons
    }

    const token = tokenService.generateRecoveryToken({ email })
    await mailService.sendRecoveryEmail(
      email,
      `${process.env.CLIENT_URL}/forgotpwd?token=${token}`
    )

    await userModel.findOneAndUpdate({ email }, { passwordUpdateToken: token })

    return `Recovery email sent to ${email}`
  }

  async updatePwd(password: string, token: string) {

    const validToken = tokenService.validatePasswordToken(token)
    if (!validToken) {
      throw new Error('Invalid token.')
    }

    const user = await userModel.findOne({ passwordUpdateToken: token })
    if (!user) {
      throw new Error('Can\'t update, check token.')
    }

    const hashPassword = await bcrypt.hash(password, 2)
    user.password = hashPassword
    user.passwordUpdateToken = ''

    await user.save()
    return user
  }

  async delete(id: string) {
    if (!id) throw new Error('Check id.')
    await userModel.findOneAndRemove({ _id: id })
    return `Deleted acc id: ${id}`
  }

}

export default new UserService()
