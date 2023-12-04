import { object, string } from 'zod'

const PwdUpdSchema = {
  body: object({
    password: string({
      required_error: 'password is required',
    }).min(8, 'password too short - should be 8 chars minimum')
  })
}

export const PwdUpdData  = object(PwdUpdSchema)
