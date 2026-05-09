import { z } from 'zod'

// query params arrive as strings, so we validate them as strings
const positiveIntString = z
  .string()
  .refine((val) => /^\d+$/.test(val) && Number(val) > 0, {
    message: 'must be a positive integer',
  })

const nonNegativeIntString = z.string().refine((val) => /^\d+$/.test(val), {
  message: 'must be a non-negative integer',
})

// ISO date string (YYYY-MM-DD) using refine to avoid deprecated .date() overloads in Zod v4
const isoDateString = z
  .string()
  .refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val) && !isNaN(Date.parse(val)), {
    message: 'must be a valid date (YYYY-MM-DD)',
  })

const statsQuerySchema = z
  .object({
    mode: z.enum(['lastN', 'dateRange']).optional(),
    lastN: positiveIntString.optional(),
    dateFrom: isoDateString.optional(),
    dateTo: isoDateString.optional(),
    minScore: nonNegativeIntString.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'lastN' && data.lastN === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['lastN'],
        message: 'lastN is required when mode is lastN',
      })
    }

    if (data.mode === 'dateRange') {
      if (!data.dateFrom) {
        ctx.addIssue({
          code: 'custom',
          path: ['dateFrom'],
          message: 'dateFrom is required when mode is dateRange',
        })
      }
      if (!data.dateTo) {
        ctx.addIssue({
          code: 'custom',
          path: ['dateTo'],
          message: 'dateTo is required when mode is dateRange',
        })
      }
    }
  })

export const statsFilterSchema = z.object({
  query: statsQuerySchema,
})
