import { object } from 'zod'
import { passwordSchema, tokenSchema } from './shared.schema'

// JWT: three base64url segments separated by dots
const JWT_REGEX = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/

const PwdUpdSchema = {
  body: object({
    password: passwordSchema,
    token: tokenSchema.regex(JWT_REGEX, {
      error: 'Something went wrong in the piping system.',
    }),
  }),
}

export const PwdUpdData = object(PwdUpdSchema)
