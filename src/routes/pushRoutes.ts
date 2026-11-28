import express from 'express'

import PushController from '../controllers/pushController'
import { PUSH_ROUTES } from '../constants/routes'
import { protect } from '../middleware/authMiddleware'
import { validate } from '../middleware/validationMiddleware'
import { subscribeSchema, unsubscribeSchema } from '../schemas/push.schema'

const router = express.Router()

router.get(
  PUSH_ROUTES.VAPID_PUBLIC_KEY,
  protect,
  PushController.getVapidPublicKey,
)

router.post(
  PUSH_ROUTES.SUBSCRIBE,
  [protect, validate(subscribeSchema)],
  PushController.subscribe,
)

router.delete(
  PUSH_ROUTES.UNSUBSCRIBE,
  [protect, validate(unsubscribeSchema)],
  PushController.unsubscribe,
)

export default router
