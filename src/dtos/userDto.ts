export class UserDto {
  name: string = ''
  email: string = ''
  id: string = ''
  isActivated: string = ''

  // eslint-disable-next-line1
  constructor(model: any) { // update this
    this.name = model.name
    this.email = model.email
    this.id = model._id
    this.isActivated = model.isActivated
  }
}
