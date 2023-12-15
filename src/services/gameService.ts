import userModel from '../models/userModel'
import resultModel from '../models/resultModel'
import { Result } from '../types/interfaces'
import { compileStats } from '../utils/stats'

class GameService {

  async save(id: string, data: Result) {
    const user = await userModel.findByIdAndUpdate(id)
    if (!user) {
      throw new Error('Can\'t save, no user with this id.')
    }

    const result = await resultModel.create(data)
    user.results.push(result.id)
    user.save()

    return result
  }

  async getResults(id: string) {
    return await userModel.findById(id)
      .populate<{ results: Result[] }>('results')
      .select('results')
  }

  async getStats(id: string) {
    const data = await userModel.findById(id)
      .populate<{ results: Result[] }>('results')
      .select('results')
    return data && compileStats(data.results)
  }

  async clearStats(id: string) {
    const user = await userModel.findById(id)
    if (user != null) {
      for (let id of user.results) {
        await resultModel.findOneAndRemove(id)
      }
      user.results = []
      await user.save()
    }
  }

}

export default new GameService()
