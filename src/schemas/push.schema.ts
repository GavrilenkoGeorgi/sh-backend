import { z } from 'zod'

const endpointSchema = z.url({ error: 'invalid endpoint' })

export const subscribeSchema = z.object({
  body: z.object({
    endpoint: endpointSchema,
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
      p256dh: z.string().min(1, { error: 'p256dh is required' }),
      auth: z.string().min(1, { error: 'auth is required' }),
    }),
  }),
})

export const unsubscribeSchema = z.object({
  body: z.object({
    endpoint: endpointSchema,
  }),
})
