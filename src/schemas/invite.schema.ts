import { z } from 'zod'

const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/

export const declineInviteSchema = z.object({
  params: z.object({
    inviteId: z.string().regex(MONGO_ID_REGEX, { error: 'invalid inviteId' }),
  }),
})
