import { Response, NextFunction } from 'express'
import gameService from '../services/gameService'
import { IReqWithUserData } from '../types/interfaces'
import { calculateAverage, computePercentFromMax } from '../utils/stats'
import { emptyStats } from '../constants'

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

    const scores: number[] = []
    const schoolScores: number[] = []
    let stats = emptyStats
    let favDiceValues: number[] = new Array(6).fill(0)

    try {
      const data = await gameService.getResults(req.user?.id)

      data?.results.forEach((item) => {
        scores.push(item.score)
        schoolScores.push(item.schoolScore)

        for (const name in stats)
          stats[name as keyof typeof stats] += item.stats[name as keyof typeof stats]
          item.favDiceValues.forEach((value, index) =>
            favDiceValues[index] += value
          )

        }
      )

      const average = Math.floor(calculateAverage(scores))
      const percentFromMax = computePercentFromMax(average, 879) // max score?

      const userStats = {
        games: data?.results.length,
        max: Math.max(...scores),
        average,
        percentFromMax,
        favDiceValues,
        stats,
        schoolScores: schoolScores,
        scores: scores.slice(0, 50) // 50 is the max to show on chart
      }

      return res.json(userStats)

    } catch (err) {
      next(err)
    } finally {
      // clear stats /?
      for (const name in stats) stats[name as keyof typeof stats] = 0
    }
  }

  async getResults(req: IReqWithUserData, res: Response, next: NextFunction) {
    try {
      const data = await gameService.getResults(req.user?.id)
      return res.json(data)
    } catch (err) {
      next(err)
    }
  }

}

export default new GameController()
