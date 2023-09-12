import userModel from '../models/userModel'
import bcrypt from 'bcryptjs'
import * as uuid from 'uuid'

import tokenService from './tokenService'
import mailService from './mailService'
import { UserDto } from '../dtos/userDto'
import { credProps, profileUpdateFields } from '../types'

class UserService {

  async registration({ name, email, password, }: credProps) {
    const existingUser = await userModel.findOne({ email })
    if (existingUser) {
      throw new Error('User already exists.')
    }

    const hashPassword = await bcrypt.hash(password, 7)
    const activationLink = uuid.v4()
    const user = await userModel.create({ name, email, password: hashPassword, activationLink })
    await mailService.sendActivationEmail(email, `${process.env.API_URL}/api/users/activate/${activationLink}`)

    const userDto = new UserDto(user)
    const tokens = tokenService.generateTokens({ ...userDto })
    await tokenService.saveToken(userDto.id, tokens.refreshToken)

    return {
      ...tokens,
      user: userDto
    }
  }

  async activate(activationLink: string) {
    const user = await userModel.findOne({ activationLink })

    if (!user) {
      throw new Error('Invalid activation link.')
    }

    user.isActivated = true
    await user.save()
  }

  async login({ email, password }: credProps) {
    const user = await userModel.findOne({ email }) as credProps

    if (!user) {
      throw new Error('User not found.')
    }

    const checkPassword = await bcrypt.compare(password, user.password)
    if (!checkPassword) {
      throw new Error('Password is incorrrect.')
    }
    const userDto = new UserDto(user)
    const tokens = tokenService.generateTokens({ ...userDto })

    await tokenService.saveToken(userDto.id, tokens.refreshToken)
    return { ...tokens, user: userDto }
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
    const userDto = new UserDto(user)
    const tokens = tokenService.generateTokens({ ...userDto })
    await tokenService.saveToken(userDto.id, tokens.refreshToken)

    return {
      ...tokens,
      user: userDto
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

  async updateUserProfile(id: string, userData: profileUpdateFields) {

    const filter = { _id: id }
    const update = {
      name: userData.name,
      email: userData.email,
      password: await bcrypt.hash(userData.password, 7)
    }

    let profile = await userModel.findOneAndUpdate(filter, update, {
      returnOriginal: false
    }).select('-password')

    return profile
  }
}

export default new UserService()
