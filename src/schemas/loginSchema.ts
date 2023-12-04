import { object, string } from 'zod'

const LoginSchema = {
  body: object({
    email: string({
      required_error: 'email is required',
    }).email('not a valid email'),
    password: string({
      required_error: 'password is required',
    }).min(8, 'password too short - should be 8 chars minimum')
      .max(256, 'a litle bit too long')
  })
}

export const loginData  = object(LoginSchema)
