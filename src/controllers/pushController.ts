import { type NextFunction, type Response } from 'express'

import { pushService } from '../modules/multiplayer/services/push.service'
import { type ReqWithUserData } from '../types/interfaces'

class PushController {
  async getVapidPublicKey(
    req: ReqWithUserData,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const publicKey = pushService.getPublicKey()
      if (!publicKey) {
        return res.status(503).json({ message: 'Push is not configured' })
      }

      return res.json({ publicKey })
    } catch (error) {
      next(error)
    }
  }

  async subscribe(req: ReqWithUserData, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return res.sendStatus(401)
      }

      await pushService.saveSubscription(
        req.user.id,
        req.body,
        req.headers['user-agent'],
      )
      return res.status(201).json({ ok: true })
    } catch (error) {
      next(error)
    }
  }

  async unsubscribe(req: ReqWithUserData, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return res.sendStatus(401)
      }

      await pushService.removeSubscription(req.user.id, req.body.endpoint)
      return res.sendStatus(204)
    } catch (error) {
      next(error)
    }
  }
}

export default new PushController()
