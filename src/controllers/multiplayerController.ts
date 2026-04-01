import { type NextFunction, type Response } from 'express'

import { inviteService } from '../modules/multiplayer/services/invite.service'
import { type ReqWithUserData } from '../types/interfaces'

class MultiplayerController {
  async getIncomingInvites(
    req: ReqWithUserData,
    res: Response,
    next: NextFunction,
  ) {
    try {
      if (!req.user?.id) {
        return res.sendStatus(401)
      }

      const invites = await inviteService.getIncomingPendingInvites(req.user.id)
      return res.json({ invites })
    } catch (error) {
      next(error)
    }
  }

  async getOutgoingInvites(
    req: ReqWithUserData,
    res: Response,
    next: NextFunction,
  ) {
    try {
      if (!req.user?.id) {
        return res.sendStatus(401)
      }

      const invites = await inviteService.getOutgoingPendingInvites(req.user.id)
      return res.json({ invites })
    } catch (error) {
      next(error)
    }
  }
}

export default new MultiplayerController()
