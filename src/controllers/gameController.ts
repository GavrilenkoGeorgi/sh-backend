import { Response, NextFunction } from 'express'
import gameService from '../services/gameService'
import { IReqWithUserData } from '../types/interfaces'
import { calculateAverage, computePercentFromMax } from '../utils/stats'

class GameController {

  async save(req: IReqWithUserData, res: Response, next: NextFunction) {
    try {
      await gameService.save(req.user?.id, req.body)
      return res.status(200).end()
    } catch (err) {
      next(err)
    }
  }

  async getStats(req: IReqWithUserData, res: Response, next: NextFunction) {
    try {
      const data = await gameService.getResults(req.user?.id)
      const scores: number[] = []

      data?.results.forEach((item) => {
        // @ts-ignore /!
        scores.push(item.score)
      })

      const average = calculateAverage(scores)
      const percentFromMax = computePercentFromMax(average, 879) // max score?
      const stats = {
        games: data?.results.length,
        max: Math.max(...scores),
        average,
        percentFromMax,
        scores: scores.slice(0, 50) // 50 is the max to show on chart
      }
      return res.json(stats)

    } catch (err) {
      next(err)
    }
  }

}

export default new GameController()
