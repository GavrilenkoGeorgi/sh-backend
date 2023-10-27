export type tokenPayload = {
  email: string,
  id: string,
  isActivated: string
}

export type credProps = { //?
  name: string,
  email: string,
  password: string
}

export type profileUpdateFields = { //??
  name: string,
  email: string,
  password: string
}

export type tokenData = {
  _id: object,
  user: object,
  refreshToken: string
  save: () => void
}

export type userData = {
  _id: string,
  name: string,
  email: string,
  createdAt: string,
  updatedAt: string,
  __v: number,
  isActivated: string,
  results: [],
  save: () => void
}

export type Nullable<T> = T | null
