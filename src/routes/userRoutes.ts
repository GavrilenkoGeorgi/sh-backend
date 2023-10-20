import express from 'express'
import UserController from '../controllers/userController'
import { protect } from '../middleware/authMiddleware'

const router = express.Router()

router.get('/', protect, UserController.getUsers)
router.post('/register', UserController.registration)
router.post('/login', UserController.login)
router.post('/refresh', UserController.refresh)
router.get('/logout', UserController.logout)
router.get('/activate/:link', UserController.activate)
router
  .route('/profile')
  .get(protect, UserController.getUserProfile)
  .put(protect, UserController.updateUserProfile)

export default router
