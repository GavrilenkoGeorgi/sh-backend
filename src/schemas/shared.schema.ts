import { string } from 'zod'

const requiredString = (fieldName: string) =>
  string({
    error: (issue) =>
      issue.input === undefined
        ? `${fieldName} is required`
        : `invalid ${fieldName}`,
  })

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/

export const passwordSchema = requiredString('password').regex(PASSWORD_REGEX, {
  error:
    'Password must be 8-64 characters and include uppercase, lowercase, and a number',
})

export const tokenSchema = requiredString('token').min(1, {
  error: "token too short - can't be an empty string",
}) // TODO: set to max token length

export const MAX_NAME_LENGTH = 256
export const MIN_NAME_LENGTH = 2
export const nameSchema = requiredString('name')
  .min(MIN_NAME_LENGTH, {
    error: `name too short - should be ${MIN_NAME_LENGTH} chars minimum`,
  })
  .max(MAX_NAME_LENGTH, {
    error: `name too long - should be ${MAX_NAME_LENGTH} chars maximum`,
  })
