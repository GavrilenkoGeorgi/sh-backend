import express from 'express'
import UserController from '../controllers/userController'
import { protect } from '../middleware/authMiddleware'
import { validate } from '../middleware/validationMiddleware'
import { PwdUpdData } from '../schemas/pwdUpd.schema'
import { newUserData } from '../schemas/user.schema'
import { loginData } from '../schemas/loginSchema'
import { profileUpdateData } from '../schemas/profileSchema'

const router = express.Router()

router.get('/', protect, UserController.getUsers)
router.post('/register', validate(newUserData), UserController.registration)
router.post('/login', validate(loginData), UserController.login)
router.post('/refresh', UserController.refresh)
router.get('/logout', UserController.logout)
router.get('/activate/:link', UserController.activate)
router.put('/reset', [protect, validate(PwdUpdData)], UserController.resetPwd)
router
  .route('/profile')
  .get(protect, UserController.getUserProfile)
  .put([protect, validate(profileUpdateData)], UserController.updateUserProfile)

export default router
