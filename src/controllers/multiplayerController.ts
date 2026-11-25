import { type NextFunction, type Response } from 'express'

import { inviteService } from '../modules/multiplayer/services/invite.service'
import { multiplayerResultService } from '../modules/multiplayer/services/result.service'
import { presenceService } from '../socket/services/presence.service'
import { getIO } from '../socket'
import { type ReqWithUserData } from '../types/interfaces'

// service throws plain errors, so map known messages to http statuses
function getDeclineErrorStatus(error: unknown): number | undefined {
  if (!(error instanceof Error)) {
    return undefined
  }

  if (error.message === 'Invite not found') {
    return 404
  }

  if (error.message.startsWith('Only the invite recipient')) {
    return 403
  }

  if (
    error.message === 'Invite is no longer pending' ||
    error.message === 'Invite has expired'
  ) {
    return 409
  }

  return undefined
}

// TODO: emitToUser is duplicated in the socket handlers, extract a shared helper into src/socket/services/
// notify every active socket of a user, same as the socket handlers do
function emitToUser(userId: string, event: string, payload: unknown): void {
  const io = getIO()
  for (const socketId of presenceService.getSocketIdsByUserId(userId)) {
    io.to(socketId).emit(event, payload)
  }
}

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

  async declineInvite(req: ReqWithUserData, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return res.sendStatus(401)
      }

      // express 5 types params as string | string[], validate() already ensures a string
      const { inviteId } = req.params
      if (typeof inviteId !== 'string') {
        return res.status(400).json({ message: 'invalid inviteId' })
      }

      const result = await inviteService.declineInvite(inviteId, req.user.id)

      const statusPayload = { inviteId: result.inviteId, status: result.status }

      // keeps the sender's and the recipient's open tabs in sync
      emitToUser(result.fromUserId, 'invite:status', statusPayload)
      emitToUser(result.toUserId, 'invite:status', statusPayload)

      return res.json(statusPayload)
    } catch (error) {
      const statusCode = getDeclineErrorStatus(error)
      if (statusCode && error instanceof Error) {
        return res.status(statusCode).json({ message: error.message })
      }

      next(error)
    }
  }

  async getResults(req: ReqWithUserData, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return res.sendStatus(401)
      }

      const results = await multiplayerResultService.getUserResults(req.user.id)
      return res.json({ results })
    } catch (error) {
      next(error)
    }
  }
}

export default new MultiplayerController()
