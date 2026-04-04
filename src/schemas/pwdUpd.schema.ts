import { object, z } from 'zod'
import { passwordSchema, tokenSchema } from './shared.schema'

const PwdUpdSchema = z.object({
  body: z.object({
    password: passwordSchema,
    token: tokenSchema,
  }),
})

export const PwdUpdData = object(PwdUpdSchema)
