import { object, string, z } from 'zod'
import { passwordSchema } from './shared.schema'

const LoginSchema = {
  body: object({
    email: z.email({ error: 'not a valid email' }),
    password: passwordSchema,
  }),
}

export const loginData = object(LoginSchema)
