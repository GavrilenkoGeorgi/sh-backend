import { Request, Response, NextFunction } from 'express'
import userService from '../services/userService'

import { CreateUserInput } from '../schemas/user.schema'

import type { IReqWithUserData } from '../types/interfaces'
import { accessCookieMaxAge, refreshCookieMaxAge } from '../constants'

class UserController {

  async registration(
    req: Request<object, object, CreateUserInput['body']>,
    res: Response,
    next: NextFunction
  ) {
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
      const { link } = req.params
      await userService.activate(link)
      return res.redirect(`${process.env.CLIENT_URL}/login` || '')
    } catch (err) {
      res.status(409)
      next(err)
    }
  }

  async login(
    req: Request<object, object, CreateUserInput['body']>,
    res: Response,
    next: NextFunction
    ) {
    try {
      const { name, email, password } = req.body
      const userData = await userService.login({ name, email, password })
      res.cookie('refreshToken', userData.refreshToken, { maxAge: refreshCookieMaxAge, httpOnly: true, sameSite: 'none', secure: true })
      res.cookie('accessToken', userData.accessToken, { maxAge: accessCookieMaxAge, httpOnly: true, sameSite: 'none', secure: true })
      return res.json(userData)
    } catch (err) {
      res.status(409)
      next(err)
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.cookies
      const token = await userService.logout(refreshToken)
      res.clearCookie('refreshToken')
      res.clearCookie('accessToken')
      return res.json(token)
    } catch (err) {
      res.status(409)
      next(err)
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.cookies
      const userData = await userService.refresh(refreshToken)
      res.cookie('refreshToken', userData.refreshToken, { maxAge: refreshCookieMaxAge, httpOnly: true, sameSite: 'none', secure: true })
      res.cookie('accessToken', userData.accessToken, { maxAge: accessCookieMaxAge, httpOnly: true, sameSite: 'none', secure: true })
      return res.json(userData)
    } catch (err) {
      res.status(409)
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

  async getUserProfile(req: IReqWithUserData, res: Response, next: NextFunction) {
    try {
      console.log(req.user?.id)
      const user = await userService.getUserProfile(req?.user?.id as string)
      return res.json(user)
    } catch (err) {
      next(err)
    }
  }

  async updateUserProfile(
    req: Request<object, object, CreateUserInput['body']>,
    res: Response,
    next: NextFunction) {
    try {
      const userData: IReqWithUserData = req as IReqWithUserData //?
      const { name, email, password } = req.body
      const user = await userService.updateUserProfile(userData.user?.id as string, { name, email, password })
      return res.json(user)
    } catch (err) {
      next(err)
    }
  }

}

export default new UserController()
