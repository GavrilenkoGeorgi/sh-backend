import { object, email } from 'zod'

const ForgotPwdSchema = {
  body: object({
    email: email({ error: 'not a valid email' }),
  }),
}

export const ForgotPwdData = object(ForgotPwdSchema)
