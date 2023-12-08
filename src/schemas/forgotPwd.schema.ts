import { object, string } from 'zod'

const ForgotPwdSchema = {
  body: object({
    email: string({
      required_error: 'email is required',
    }).email('not a valid email')
  })
}

export const ForgotPwdData  = object(ForgotPwdSchema)
