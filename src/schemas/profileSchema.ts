import { object, email } from 'zod'
import { nameSchema } from './shared.schema'

const ProfileSchema = {
  body: object({
    name: nameSchema,
    email: email({ error: 'not a valid email' }),
  }),
}

export const profileUpdateData = object(ProfileSchema)
