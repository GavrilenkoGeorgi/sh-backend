import userModel from '../models/userModel'
import resultModel from '../models/resultModel'
import { IResult } from '../types/interfaces'
import { ResultDto } from '../dtos'

class GameService {

  async save(id: string, data: IResult) {

    const user = await userModel.findByIdAndUpdate(id)
    if (!user) {
      throw new Error('Can\'t save, no user with this id.')
    }

    const resDto = new ResultDto(data)
    const result = await resultModel.create(resDto)
    user.results.push(result.id)
    user.save()

    return result
  }

  async getResults(id: string) {
    const results = userModel.findById(id).lean().populate('results').select('results')
    return results
  }

}

export default new GameService()
