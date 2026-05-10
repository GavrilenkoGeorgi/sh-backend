import { number, object, string, record } from 'zod'

export const MAX_SCORE = 879

const ResultSchema = {
  body: object({
    score: number({
      error: 'score is required',
    })
      .min(-MAX_SCORE, 'lowerst score') // min score can't be so low?
      .max(MAX_SCORE, 'highest score'),
    schoolScore: number({
      error: 'score is required',
    })
      .min(-MAX_SCORE, 'lowerst score')
      .max(MAX_SCORE, 'highest score'),
    favDiceValues: number({
      error: 'score is required',
    }).array(),
    stats: record(string(), number()),
  }),
}

export const newResultData = object(ResultSchema)
