import userModel from '../models/userModel'
import resultModel from '../models/resultModel'
import { IResult } from '../types/interfaces'

class GameService {

  async save(id: string, data: IResult) {
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
      .populate<{ results: IResult[] }>('results')
      .select('results')
  }

}

export default new GameService()
