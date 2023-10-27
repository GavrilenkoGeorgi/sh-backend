import express from 'express'
import GameController from '../controllers/gameController'
import { protect } from '../middleware/authMiddleware'

const router = express.Router()

router.post('/save', protect, GameController.save)
router.get('/stats', protect, GameController.getStats)

export default router
