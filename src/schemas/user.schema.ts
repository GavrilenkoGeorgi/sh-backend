import { object, email } from 'zod'
import { nameSchema, passwordSchema } from './shared.schema'

const UserSchema = object({
  body: object({
    name: nameSchema,
    email: email({ error: 'Needs to be a valid email address' }),
    password: passwordSchema,
  }),
})

export const newUserData = UserSchema
