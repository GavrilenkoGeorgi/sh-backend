import { Stats, DiceStats } from '../types/interfaces'

export const emptyStats: Stats = {
  pair: 0,
  twoPairs: 0,
  triple: 0,
  full: 0,
  quads: 0,
  poker: 0,
  small: 0,
  large: 0,
}

export const emptyDiceStats: DiceStats = {
  ones: 0,
  twos: 0,
  threes: 0,
  fours: 0,
  fives: 0,
  sixes: 0,
}

export const accessCookieMaxAge: number = 24 * 60 * 60 * 1000 // 24 hours
export const refreshCookieMaxAge: number = 72 * 60 * 60 * 1000 // 72 hours

// re-export route constants
export * from './routes'
