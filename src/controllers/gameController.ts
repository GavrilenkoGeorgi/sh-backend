import { Response, NextFunction } from 'express'
import gameService from '../services/gameService'
import { IReqWithUserData, ChartAxisData } from '../types/interfaces'
import { calculateAverage, computePercentFromMax } from '../utils/stats'
import { emptyStats, emptyDiceStats } from '../constants'
import { v4 } from 'uuid'

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
    let favComb: ChartAxisData[] = []
    let favDiceValues: ChartAxisData[] = []
    let stats = emptyStats
    let diceStats = emptyDiceStats

    try {
      const data = await gameService.getResults(req.user?.id)

      data?.results.forEach((item) => {
        scores.push(item.score)
        schoolScores.push(item.schoolScore)

        for (const name in stats)
          stats[name as keyof typeof stats] += item.stats[name as keyof typeof stats]

        item.favDiceValues.forEach((value, index) => {
          const name = Object.keys(diceStats)[index]
          diceStats[name as keyof typeof diceStats] += value
        })

      })

      for (const name in stats) {
        favComb.push({
          id: name,
          value: stats[name as keyof typeof stats]
        })
      }

      for (const name in diceStats) { // this clearly needs to be one thing
        favDiceValues.push({
          id: name,
          value: diceStats[name as keyof typeof diceStats]
        })
      }

      const average = Math.floor(calculateAverage(scores))
      const percentFromMax = computePercentFromMax(average, 879) // max score?

      const userStats = {
        games: data?.results.length,
        max: Math.max(...scores),
        average,
        percentFromMax,
        favDiceValues,
        favComb,
        schoolScores: schoolScores.slice(0, 50).map(score => ({ id: v4().substring(0, 3), value: score })),
        scores: scores.slice(0, 50).map(score => ({ id: v4().substring(0, 3), value: score }))
      }

      return res.json(userStats)

    } catch (err) {
      next(err)
    } finally {
      // clear stats or calc them on new result save
      for (const name in stats) stats[name as keyof typeof stats] = 0 // ?
      for (const name in diceStats) diceStats[name as keyof typeof diceStats] = 0 // !
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
