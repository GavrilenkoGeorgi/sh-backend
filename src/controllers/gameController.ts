import { Request, Response, NextFunction } from 'express'
import gameService from '../services/gameService'
import { IReqWithUserData } from '../types/interfaces'

class GameController {

  async save(req: IReqWithUserData, res: Response, next: NextFunction) {
    try {
      await gameService.save(req.user?.id, req.body)
      return res.status(200).end()
    } catch (err) {
      next(err)
    }
  }

  async getResults(req: IReqWithUserData, res: Response, next: NextFunction) {
    try {
      const results = await gameService.getResults(req.user?.id)
      return res.json(results)
    } catch (err) {
      next(err)
    }
  }

}

export default new GameController()
