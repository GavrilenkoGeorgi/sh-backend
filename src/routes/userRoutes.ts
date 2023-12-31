import express from 'express'
import UserController from '../controllers/userController'
import { protect } from '../middleware/authMiddleware'
import { validate } from '../middleware/validationMiddleware'
import { PwdUpdData } from '../schemas/pwdUpd.schema'
import { ForgotPwdData } from '../schemas/forgotPwd.schema'
import { newUserData } from '../schemas/user.schema'
import { loginData } from '../schemas/loginSchema'
import { profileUpdateData } from '../schemas/profileSchema'

const router = express.Router()

router.post('/register', validate(newUserData), UserController.registration)
router.post('/login', validate(loginData), UserController.login)
router.post('/refresh', UserController.refresh)
router.get('/logout', UserController.logout)
router.get('/activate/:link', UserController.activate)
router.post('/forgotpwd', validate(ForgotPwdData), UserController.forgotPwd)
router.put('/updatepwd', validate(PwdUpdData), UserController.updatePwd)
router.delete('/delete', protect, UserController.delete)
router
  .route('/profile')
  .get(protect, UserController.getUserProfile)
  .put([protect, validate(profileUpdateData)], UserController.updateUserProfile)

export default router
