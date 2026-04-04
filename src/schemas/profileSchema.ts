import { object, string, z } from 'zod'
import { nameSchema } from './shared.schema'

const ProfileSchema = {
  body: object({
    name: nameSchema,
    email: z.email({ error: 'not a valid email' }),
  }),
}

export const profileUpdateData = object(ProfileSchema)
