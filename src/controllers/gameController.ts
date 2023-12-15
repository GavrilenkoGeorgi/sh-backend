import { Response, NextFunction } from 'express'
import gameService from '../services/gameService'
import { ReqWithUserData, ChartAxisData } from '../types/interfaces'
import { calculateAverage, computePercentFromMax } from '../utils/stats'
import { emptyStats, emptyDiceStats } from '../constants'
import { getPercent, getAxisValues } from '../utils/stats'

class GameController {

  async save(req: ReqWithUserData, res: Response, next: NextFunction) {
    try {
      await gameService.save(req.user?.id, req.body)
      return res.send('Saved.')
    } catch (err) {
      next(err)
    }
  }

  async getStats(req: ReqWithUserData, res: Response, next: NextFunction) {
    try {
      const data = await gameService.getStats(req.user?.id)
      return res.json(data)
    } catch (err) {
      next(err)
    }
  }

  async getResults(req: ReqWithUserData, res: Response, next: NextFunction) {
    try {
      const data = await gameService.getResults(req.user?.id)
      return res.json(data)
    } catch (err) {
      next(err)
    }
  }

  async clearStats(req: ReqWithUserData, res: Response, next: NextFunction) {
    try {
      await gameService.clearStats(req.user?.id)
      return res.end()
    } catch (err) {
      next(err)
    }
  }

}

export default new GameController()
