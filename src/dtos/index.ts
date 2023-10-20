import { IResult } from '../types/interfaces'

export class UserDto {
  name: string = ''
  email: string = ''
  id: string = ''
  isActivated: string = ''

  constructor(model: any) { //?
    this.name = model.name
    this.email = model.email
    this.id = model._id
    this.isActivated = model.isActivated
  }
}

export class ResultDto {
  score: number = 0
  favDiceValues: [number] = [0]
  stats: Object = {}

  constructor(model: IResult) {
    this.score = model.score
    this.favDiceValues = model.favDiceValues
    this.stats = model.stats
  }
}
