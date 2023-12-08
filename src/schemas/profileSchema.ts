import { object, string } from 'zod'

const ProfileSchema = {
  body: object({
    name: string({ required_error: 'name is required' }),
    email: string({
      required_error: 'email is required'
    }).email('not a valid email')
  })
}

export const profileUpdateData  = object(ProfileSchema)
