import express from 'express'
import GameController from '../controllers/gameController'
import { protect } from '../middleware/authMiddleware'
import { validate } from '../middleware/validationMiddleware'
import { newResultData } from '../schemas/result.schema'

const router = express.Router()

router.post('/save', [protect, validate(newResultData)], GameController.save)
router.get('/stats', protect, GameController.getStats)
router.get('/user-results', protect, GameController.getResults)
router.delete('/clearstats', protect, GameController.clearStats)

export default router
