import { object, string } from 'zod'

const UserSchema = {
  body: object({
    name: string({ required_error: 'name is required' }),
    email: string({
      required_error: 'email is required',
    }).email('not a valid email'),
    password: string({
      required_error: 'password is required',
    }).min(8, 'password too short - should be 8 chars minimum')
  })
}

export const newUserData  = object(UserSchema)
