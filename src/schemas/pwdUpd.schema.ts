import { object, string } from 'zod'

const PwdUpdSchema = {
  body: object({
    password: string({
      required_error: 'password is required',
    }).min(8, 'password too short - should be 8 chars minimum'),
    token: string({
      required_error: 'token is required',
    }).min(1, 'token too short - can\'t be an empty string')
  })
}

export const PwdUpdData  = object(PwdUpdSchema)
