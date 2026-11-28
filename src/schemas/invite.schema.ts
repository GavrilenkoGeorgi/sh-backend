import { z } from 'zod'

const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/

export const INVITABLE_SEARCH_MIN_LENGTH = 2

export const invitableUsersSchema = z.object({
  query: z.object({
    search: z
      .string()
      .trim()
      .min(INVITABLE_SEARCH_MIN_LENGTH, {
        error: `search must be at least ${INVITABLE_SEARCH_MIN_LENGTH} characters`,
      })
      .max(50, { error: 'search is too long' })
      .optional(),
  }),
})

export const declineInviteSchema = z.object({
  params: z.object({
    inviteId: z.string().regex(MONGO_ID_REGEX, { error: 'invalid inviteId' }),
  }),
})
