import { Request } from 'express'
import { Document } from 'mongoose'
import { UserDocument } from '../models/userModel'

export interface JwtUser {
  id: string
}

export interface ReqWithUserData extends Request {
  user?: UserDocument
}

export interface Stats {
  pair: number
  twoPairs: number
  triple: number
  full: number
  quads: number
  poker: number
  small: number
  large: number
}

export interface Result extends Document {
  score: number
  schoolScore: number
  favDiceValues: [number]
  stats: Stats
}

export interface ChartAxisData {
  id: string
  value: number
}

// used for score series — `timestamp` is an ISO date string or Date object
export interface ScoreAxisData {
  timestamp: string | Date
  value: number
}

export interface DiceStats {
  ones: number
  twos: number
  threes: number
  fours: number
  fives: number
  sixes: number
}

export interface StatsSummary {
  games: number
  max: number
  average: number
  schoolAverage: number | null
  percentFromMax: number
}

export interface UserStats {
  summary: StatsSummary
  scores: ScoreAxisData[]
  schoolScores: ScoreAxisData[]
  favDiceValues: ChartAxisData[]
  favComb: ChartAxisData[]
}

type FilterMode = 'all' | 'lastN' | 'dateRange'

export interface AppliedFilter {
  mode: FilterMode
  lastN: number | null
  minScore: number | null
}

export interface StatsResponse extends UserStats {
  filter: AppliedFilter
}

export interface StatsFilter {
  mode: FilterMode
  lastN?: number
  dateFrom?: Date
  dateTo?: Date
  minScore?: number
}
