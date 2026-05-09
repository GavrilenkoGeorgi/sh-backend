import { Response, NextFunction } from 'express'
import gameService from '../services/gameService'
import { ReqWithUserData, StatsFilter } from '../types/interfaces'

class GameController {
  async save(req: ReqWithUserData, res: Response, next: NextFunction) {
    try {
      const newGame = await gameService.save(req.user!.id, req.body)

      return res.status(201).json({
        success: true,
        message: 'Result saved successfully.',
        data: newGame,
      })
    } catch (err) {
      next(err)
    }
  }

  async getStats(req: ReqWithUserData, res: Response, next: NextFunction) {
    try {
      // validate middleware has already confirmed the query params are valid
      const query = req.query as Record<string, string | undefined>
      const { mode, lastN, dateFrom, dateTo, minScore } = query

      let filter: StatsFilter

      if (!mode) {
        // default: last 50 games
        filter = { mode: 'lastN', lastN: 50 }
      } else if (mode === 'lastN') {
        filter = { mode: 'lastN', lastN: Number(lastN) }
      } else {
        // dateRange — dateFrom and dateTo presence validated by middleware
        filter = {
          mode: 'dateRange',
          dateFrom: new Date(dateFrom as string),
          dateTo: new Date(dateTo as string),
        }
      }

      if (minScore !== undefined) {
        filter.minScore = Number(minScore)
      }

      const data = await gameService.getStats(req.user!.id, filter)
      return res.json(data)
    } catch (err) {
      next(err)
    }
  }

  async getResults(req: ReqWithUserData, res: Response, next: NextFunction) {
    try {
      const data = await gameService.getResults(req.user!.id)
      return res.json(data)
    } catch (err) {
      next(err)
    }
  }

  async clearStats(req: ReqWithUserData, res: Response, next: NextFunction) {
    try {
      await gameService.clearStats(req.user!.id)
      return res.end()
    } catch (err) {
      next(err)
    }
  }
}

export default new GameController()
