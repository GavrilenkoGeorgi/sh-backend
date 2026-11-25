import express from 'express'

import MultiplayerController from '../controllers/multiplayerController'
import { MULTIPLAYER_ROUTES } from '../constants/routes'
import { protect } from '../middleware/authMiddleware'
import { validate } from '../middleware/validationMiddleware'
import { declineInviteSchema } from '../schemas/invite.schema'

const router = express.Router()

router.get(
  MULTIPLAYER_ROUTES.INCOMING_INVITES,
  protect,
  MultiplayerController.getIncomingInvites,
)

router.get(
  MULTIPLAYER_ROUTES.OUTGOING_INVITES,
  protect,
  MultiplayerController.getOutgoingInvites,
)

router.post(
  MULTIPLAYER_ROUTES.DECLINE_INVITE,
  [protect, validate(declineInviteSchema)],
  MultiplayerController.declineInvite,
)

router.get(
  MULTIPLAYER_ROUTES.RESULTS,
  protect,
  MultiplayerController.getResults,
)

export default router
