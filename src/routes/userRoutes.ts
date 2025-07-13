import express from 'express'
import UserController from '../controllers/userController'
import { protect } from '../middleware/authMiddleware'
import { validate } from '../middleware/validationMiddleware'
import { PwdUpdData } from '../schemas/pwdUpd.schema'
import { ForgotPwdData } from '../schemas/forgotPwd.schema'
import { newUserData } from '../schemas/user.schema'
import { loginData } from '../schemas/loginSchema'
import { profileUpdateData } from '../schemas/profileSchema'
import { USER_ROUTES } from '../constants/routes'

const router = express.Router()

router.post(
  USER_ROUTES.REGISTER,
  validate(newUserData),
  UserController.registration
)
router.post(USER_ROUTES.LOGIN, validate(loginData), UserController.login)
router.post(USER_ROUTES.REFRESH, UserController.refresh)
router.get(USER_ROUTES.LOGOUT, UserController.logout)
router.get(USER_ROUTES.ACTIVATE, UserController.activate)
router.post(
  USER_ROUTES.FORGOT_PASSWORD,
  validate(ForgotPwdData),
  UserController.forgotPwd
)
router.put(
  USER_ROUTES.UPDATE_PASSWORD,
  validate(PwdUpdData),
  UserController.updatePwd
) // TODO: check if POST is needed because of cors
router.delete(USER_ROUTES.DELETE, protect, UserController.delete)
router
  .route(USER_ROUTES.PROFILE)
  .get(protect, UserController.getUserProfile)
  .post(
    [protect, validate(profileUpdateData)],
    UserController.updateUserProfile
  )

export default router
