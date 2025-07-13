import express from 'express'
import GameController from '../controllers/gameController'
import { protect } from '../middleware/authMiddleware'
import { validate } from '../middleware/validationMiddleware'
import { newResultData } from '../schemas/result.schema'
import { GAME_ROUTES } from '../constants/routes'

const router = express.Router()

router.post(
  GAME_ROUTES.SAVE,
  [protect, validate(newResultData)],
  GameController.save
)
router.get(GAME_ROUTES.STATS, protect, GameController.getStats)
router.get(GAME_ROUTES.USER_RESULTS, protect, GameController.getResults)
router.delete(GAME_ROUTES.CLEAR_STATS, protect, GameController.clearStats)

export default router
