import express from 'express'

import MultiplayerController from '../controllers/multiplayerController'
import { MULTIPLAYER_ROUTES } from '../constants/routes'
import { protect } from '../middleware/authMiddleware'

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

export default router
