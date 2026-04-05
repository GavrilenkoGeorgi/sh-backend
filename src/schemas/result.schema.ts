import { number, object, string, record } from 'zod'

const ResultSchema = {
  body: object({
    score: number({
      error: 'score is required',
    })
      .min(-879, 'lowerst score')
      .max(879, 'highest score'),
    schoolScore: number({
      error: 'score is required',
    })
      .min(-879, 'lowerst score')
      .max(879, 'highest score'),
    favDiceValues: number({
      error: 'score is required',
    }).array(),
    stats: record(string(), number()),
  }),
}

export const newResultData = object(ResultSchema)
