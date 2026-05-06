import { describe, it, expect, jest } from '@jest/globals'
import bcrypt from 'bcryptjs'
import * as uuid from 'uuid'

import userService from './userService'
import userModel from '../models/userModel'
import tokenService from './tokenService'
import mailService from './mailService'

jest.mock('../models/userModel', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  },
}))

jest.mock('./tokenService', () => ({
  __esModule: true,
  default: {
    generateTokens: jest.fn(),
    saveToken: jest.fn(),
  },
}))

jest.mock('./mailService', () => ({
  __esModule: true,
  default: {
    sendActivationEmail: jest.fn(),
  },
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}))

jest.mock('uuid', () => ({
  v4: jest.fn(),
}))

describe('UserService', () => {
  describe('registration', () => {
    it('should throw if email is already taken', async () => {
      jest.mocked(userModel.findOne).mockResolvedValue({ email: 'taken@test.com' } as never)

      await expect(
        userService.registration({
          name: 'Test',
          email: 'taken@test.com',
          password: 'pass123',
        }),
      ).rejects.toThrow('Something went wrong in the piping system.')
    })

    it('should create a new user and send an activation email', async () => {
      const fakeUser = {
        _id: 'user-id',
        email: 'new@test.com',
        name: 'New User',
      }

      jest.mocked(userModel.findOne).mockResolvedValue(null)
      jest.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never)
      jest.mocked(uuid.v4).mockReturnValue('activation-link-uuid')
      jest.mocked(userModel.create).mockResolvedValue(fakeUser as never)
      jest.mocked(mailService.sendActivationEmail).mockResolvedValue(undefined)

      const result = await userService.registration({
        name: 'New User',
        email: 'new@test.com',
        password: 'pass123',
      })

      expect(userModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@test.com',
          password: 'hashed-password',
          activationLink: 'activation-link-uuid',
        }),
      )
      expect(mailService.sendActivationEmail).toHaveBeenCalledWith(
        'new@test.com',
        expect.stringContaining('activation-link-uuid'),
      )
      expect(result).toEqual(fakeUser)
    })
  })

  describe('login', () => {
    it('should throw if user is not found', async () => {
      jest.mocked(userModel.findOne).mockResolvedValue(null)

      await expect(
        userService.login({ email: 'nobody@test.com', password: 'pass' }),
      ).rejects.toThrow("Can't login, check creds.")
    })

    it('should throw if user account is not activated', async () => {
      jest.mocked(userModel.findOne).mockResolvedValue({
        email: 'inactive@test.com',
        isActivated: false,
        password: 'hashed-password',
      } as never)

      await expect(
        userService.login({ email: 'inactive@test.com', password: 'pass' }),
      ).rejects.toThrow('Check activation status.')
    })

    it('should throw if password is incorrect', async () => {
      jest.mocked(userModel.findOne).mockResolvedValue({
        email: 'user@test.com',
        isActivated: true,
        password: 'hashed-password',
      } as never)
      jest.mocked(bcrypt.compare).mockResolvedValue(false as never)

      await expect(
        userService.login({
          email: 'user@test.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow("Can't login, check creds.")
    })

    it('should return tokens and safe user on valid credentials', async () => {
      const fakeUser = {
        id: 'user-id',
        email: 'user@test.com',
        isActivated: true,
        password: 'hashed-password',
      }
      const fakeSafeUser = {
        id: 'user-id',
        email: 'user@test.com',
        name: 'Test User',
      }
      const fakeTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }

      jest.mocked(userModel.findOne).mockResolvedValue(fakeUser as never)
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never)
      jest.mocked(tokenService.generateTokens).mockReturnValue(fakeTokens as never)
      jest.mocked(tokenService.saveToken).mockResolvedValue(undefined as never)
      jest.mocked(userModel.findById).mockReturnValue({
        select: jest.fn().mockResolvedValue(fakeSafeUser as never),
      } as never)

      const result = await userService.login({
        email: 'user@test.com',
        password: 'correct-password',
      })

      expect(result).toEqual({ ...fakeTokens, user: fakeSafeUser })
      expect(tokenService.saveToken).toHaveBeenCalledWith(
        'user-id',
        'refresh-token',
      )
    })
  })
})
