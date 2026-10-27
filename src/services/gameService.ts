import { Types } from 'mongoose'
import userModel from '../models/userModel'
import resultModel from '../models/resultModel'
import {
  Result,
  StatsFilter,
  StatsResponse,
  AppliedFilter,
} from '../types/interfaces'
import { compileStats } from '../utils/stats'
import MultiplayerResult from '../modules/multiplayer/models/MultiplayerResult'

// TODO: check filters one more time, as they can have some tricky edge cases
// construct an ObjectId boundary from a date for range-based queries on _id,
// since Result documents have no separate createdAt field
function objectIdFromDate(date: Date): Types.ObjectId {
  const hexSeconds = Math.floor(date.getTime() / 1000)
    .toString(16)
    .padStart(8, '0')
  return new Types.ObjectId(`${hexSeconds}0000000000000000`)
}

class GameService {
  async save(id: string, data: Result) {
    const user = await userModel.findById(id).select('+results')
    if (!user) {
      throw new Error("Can't save, no user with this id.")
    }

    const result = await resultModel.create(data)
    user.results.push(result._id)
    await user.save()

    return result
  }

  async getResults(id: string) {
    return await userModel
      .findById(id)
      .populate<{ results: Result[] }>('results')
      .select('results')
  }

  async getStats(id: string, filter: StatsFilter) {
    const user = await userModel.findById(id).select('results')
    if (!user) return null

    // use $and to keep $in membership separate from the date range bounds —
    // combining $in + $gte/$lt on the same field object lets MongoDB's query
    // planner satisfy $in via point lookups and skip the range check entirely
    const baseQuery: Record<string, unknown> = {}

    if (filter.mode === 'dateRange' && filter.dateFrom && filter.dateTo) {
      // make dateTo inclusive by advancing to the start of the next day
      const toDate = new Date(filter.dateTo)
      toDate.setDate(toDate.getDate() + 1)

      baseQuery.$and = [
        { _id: { $in: user.results } },
        {
          _id: {
            $gte: objectIdFromDate(filter.dateFrom),
            $lt: objectIdFromDate(toDate),
          },
        },
      ]
    } else {
      baseQuery._id = { $in: user.results }
    }

    if (filter.minScore !== undefined) {
      baseQuery.score = { $gte: filter.minScore }
    }

    // limit(0) means no limit in MongoDB; chain inline to avoid mutation footgun
    const limit =
      filter.mode === 'lastN' && filter.lastN !== undefined ? filter.lastN : 0
    const results = await resultModel
      .find(baseQuery)
      .sort({ _id: -1 })
      .limit(limit)

    const appliedFilter: AppliedFilter = {
      mode: filter.mode,
      lastN: filter.lastN ?? null,
      minScore: filter.minScore ?? null,
    }

    const statsData = compileStats(results)
    return { filter: appliedFilter, ...statsData } satisfies StatsResponse
  }

  async getMultiplayerStats(id: string) {
    const user = await userModel.findById(id).select('multiplayerResults')
    if (!user) return null

    const baseQuery: Record<string, unknown> = {}

    baseQuery._id = { $in: user.multiplayerResults }

    const results = await MultiplayerResult.find(baseQuery)
      .sort({ _id: -1 })
      .limit(0) // No limit, fetch all results for now

    const metaData = {
      totalGames: results.length,
      wins: results.filter((r) => r.outcome === 'win').length,
      losses: results.filter((r) => r.outcome === 'loss').length,
      ties: results.filter((r) => r.outcome === 'tie').length,
    }

    return { metaData, results }
  }

  async clearStats(id: string) {
    const user = await userModel.findById(id)
    if (user != null) {
      for (const resId of user.results) {
        await resultModel.findByIdAndDelete(resId)
      }
      user.results = []
      await user.save()
    }
  }
}

export default new GameService()
