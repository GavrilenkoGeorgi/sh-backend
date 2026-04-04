import { object, z } from 'zod'

const ForgotPwdSchema = {
  body: object({
    email: z.email({ error: 'not a valid email' }),
  }),
}

export const ForgotPwdData = object(ForgotPwdSchema)
