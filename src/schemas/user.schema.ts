import { z } from 'zod'
import { nameSchema, passwordSchema } from './shared.schema'

const UserSchema = z.object({
  body: z.object({
    name: nameSchema,
    email: z.email({ error: 'Needs to be a valid email address' }),
    password: passwordSchema,
  }),
})

export const newUserData = UserSchema
