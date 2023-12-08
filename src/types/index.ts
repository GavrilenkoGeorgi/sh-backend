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

export interface profileUpdateData {
  name: string,
  email: string
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

export type recoveryTokenData = {
  email: string
}

export type Nullable<T> = T | null

export enum GameCombinations { // combination names?
  PAIR = 'pair',
  TWOPAIRS = 'twoPairs',
  TRIPLE = 'triple',
  FULL = 'full',
  QUADS = 'quads',
  POKER = 'poker',
  SMALL = 'small',
  LARGE = 'large',
  CHANCE = 'chance'
}

export enum SchoolCombinations {
  ONES = 'ones',
  TWOS = 'twos',
  THREES = 'threes',
  FOURS = 'fours',
  FIVES = 'fives',
  SIXES = 'sixes'
}
