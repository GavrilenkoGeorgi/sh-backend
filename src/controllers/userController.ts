import { Request, Response, NextFunction } from 'express'
import userService from '../services/userService'

import type { ReqWithUserData } from '../types/interfaces'
import { accessCookieMaxAge, refreshCookieMaxAge } from '../constants'

const isProd = process.env.NODE_ENV === 'production'

const cookieOptions: {
  httpOnly: boolean
  sameSite: 'none' | 'lax' | 'strict'
  secure: boolean
} = {
  httpOnly: true,
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd,
}

class UserController {
  async registration(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password } = req.body
      const userData = await userService.registration({ name, email, password })
      return res.json(userData)
    } catch (err) {
      res.status(409)
      next(err)
    }
  }

  async activate(req: Request, res: Response, next: NextFunction) {
    try {
      const url = process.env.CLIENT_URL
      if (!url) {
        throw new Error('CLIENT_URL is not defined')
      }
      const { link } = req.params
      await userService.activate(link)
      return res.redirect(`${process.env.CLIENT_URL}/login`)
    } catch (err) {
      res.status(409)
      next(err)
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body
      const userData = await userService.login({ email, password })
      res.cookie('refreshToken', userData.refreshToken, {
        maxAge: refreshCookieMaxAge,
        ...cookieOptions,
      })
      res.cookie('accessToken', userData.accessToken, {
        maxAge: accessCookieMaxAge,
        ...cookieOptions,
      })
      // TODO: remove access and refresh tokens from response body
      const { refreshToken, accessToken, ...userDataWithoutTokens } = userData
      return res.json(userDataWithoutTokens.user)
    } catch (err) {
      res.status(409)
      next(err)
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken
      if (refreshToken) {
        await userService.logout(refreshToken)
      }

      res.clearCookie('refreshToken', cookieOptions)
      res.clearCookie('accessToken', cookieOptions)
      return res.sendStatus(204)
    } catch (err) {
      next(err)
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken
      if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token missing.' })
      }

      const userData = await userService.refresh(refreshToken)

      res.cookie('refreshToken', userData.refreshToken, {
        maxAge: refreshCookieMaxAge,
        ...cookieOptions,
      })

      res.cookie('accessToken', userData.accessToken, {
        maxAge: accessCookieMaxAge,
        ...cookieOptions,
      })

      return res.json(userData)
    } catch (err) {
      next(err)
    }
  }

  async checkAuthStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { accessToken } = req.cookies
      const resp = await userService.checkAuthStatus(accessToken)
      return res.json(resp)
    } catch (err) {
      res.status(401)
      next(err)
    }
  }

  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await userService.getAllUsers()
      return res.json(users)
    } catch (err) {
      next(err)
    }
  }

  async getUserProfile(
    req: ReqWithUserData,
    res: Response,
    next: NextFunction,
  ) {
    try {
      if (!req.user?.id) {
        return res.sendStatus(401)
      }
      const user = await userService.getUserProfile(req?.user?.id)
      return res.json(user)
    } catch (err) {
      next(err)
    }
  }

  async updateUserProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userData = req as ReqWithUserData
      if (!userData.user?.id) {
        return res.sendStatus(401)
      }
      const { name, email } = req.body
      const user = await userService.updateUserProfile(userData.user?.id, {
        name,
        email,
      })
      return res.json(user)
    } catch (err) {
      next(err)
    }
  }

  async forgotPwd(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body
      await userService.forgotPwd(email)
      return res.end()
    } catch (err) {
      res.status(400)
      next(err)
    }
  }

  async updatePwd(req: Request, res: Response, next: NextFunction) {
    try {
      const { password, token } = req.body
      await userService.updatePwd(password, token)
      return res.end()
    } catch (err) {
      res.status(400)
      next(err)
    }
  }

  async delete(req: ReqWithUserData, res: Response, next: NextFunction) {
    try {
      const { user } = req
      await userService.delete(user?.id)
      return res.end()
    } catch (err) {
      res.status(400)
      next(err)
    }
  }
}

export default new UserController()
