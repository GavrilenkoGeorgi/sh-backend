import { Request, Response, NextFunction } from 'express'
import { z, ZodError } from 'zod'

export const validate =
  <T extends z.ZodTypeAny>(schema: T) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })

      return next()
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        })
      }

      return res.status(400).json({ message: 'Validation error', error })
    }
  }
