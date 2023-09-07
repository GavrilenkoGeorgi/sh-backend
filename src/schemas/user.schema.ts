import { object, string, TypeOf } from 'zod'

const UserSchema = {
  body: object({
    name: string({required_error: 'name is required',}),
    email: string({
      required_error: 'email is required',
    }).email('not a valid email'),
    password: string({
      required_error: 'password is required',
    }).min(12, 'password too short - should be 12 chars minimum')
  })
}

export const createUserSchema  = object(UserSchema)
export type CreateUserInput = TypeOf<typeof createUserSchema>
