import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { Types } from 'mongoose'

import gameService from './gameService'
import userModel from '../models/userModel'
import resultModel from '../models/resultModel'
import { compileStats } from '../utils/stats'
import type { StatsFilter } from '../types/interfaces'

jest.mock('../models/userModel', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}))

jest.mock('../models/resultModel', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}))

// mock compileStats to decouple from Result shape details
jest.mock('../utils/stats', () => ({
  compileStats: jest.fn(),
}))

// builds a mock mongoose query that is awaitable and tracks sort/limit calls
function makeMockQuery(results: unknown[] = []) {
  const resolved = Promise.resolve(results)
  return {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    then: resolved.then.bind(resolved),
    catch: resolved.catch.bind(resolved),
    finally: resolved.finally.bind(resolved),
  }
}

describe('gameService.getStats', () => {
  const userId = new Types.ObjectId().toString()
  const resultId = new Types.ObjectId()

  beforeEach(() => {
    jest.mocked(compileStats).mockReturnValue({ games: 0 } as never)
  })

  it('returns null when user does not exist', async () => {
    jest.mocked(userModel.findById).mockReturnValue({
      select: jest.fn().mockResolvedValue(null as never),
    } as never)

    const result = await gameService.getStats(userId, {
      mode: 'lastN',
      lastN: 50,
    })

    expect(result).toBeNull()
  })

  it('scopes query to the user results and applies limit for lastN mode', async () => {
    const fakeUser = { results: [resultId] }
    jest.mocked(userModel.findById).mockReturnValue({
      select: jest.fn().mockResolvedValue(fakeUser as never),
    } as never)

    const mockQuery = makeMockQuery([])
    jest.mocked(resultModel.find).mockReturnValue(mockQuery as never)

    const filter: StatsFilter = { mode: 'lastN', lastN: 10 }
    await gameService.getStats(userId, filter)

    expect(resultModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: expect.objectContaining({ $in: fakeUser.results }),
      }),
    )
    expect(mockQuery.sort).toHaveBeenCalledWith({ _id: -1 })
    expect(mockQuery.limit).toHaveBeenCalledWith(10)
  })

  it('adds ObjectId date bounds and calls limit(0) for dateRange mode', async () => {
    const fakeUser = { results: [resultId] }
    jest.mocked(userModel.findById).mockReturnValue({
      select: jest.fn().mockResolvedValue(fakeUser as never),
    } as never)

    const mockQuery = makeMockQuery([])
    jest.mocked(resultModel.find).mockReturnValue(mockQuery as never)

    const filter: StatsFilter = {
      mode: 'dateRange',
      dateFrom: new Date('2025-01-01'),
      dateTo: new Date('2025-12-31'),
    }
    await gameService.getStats(userId, filter)

    // service now uses $and to separate $in membership from the date range
    // so MongoDB's query planner can satisfy $in via point lookups
    const findArg = jest.mocked(resultModel.find).mock
      .calls[0][0] as unknown as {
      $and: [
        { _id: { $in: unknown } },
        { _id: { $gte: unknown; $lt: unknown } },
      ]
    }
    expect(findArg.$and[1]._id.$gte).toBeInstanceOf(Types.ObjectId)
    expect(findArg.$and[1]._id.$lt).toBeInstanceOf(Types.ObjectId)
    // $lt encodes dateTo+1 day, so it must be strictly greater than $gte
    expect(
      String(findArg.$and[1]._id.$lt) > String(findArg.$and[1]._id.$gte),
    ).toBe(true)
    // limit(0) means no limit in MongoDB — always called with 0 for dateRange
    expect(mockQuery.limit).toHaveBeenCalledWith(0)
  })

  it('adds a score.$gte condition when minScore is provided', async () => {
    const fakeUser = { results: [resultId] }
    jest.mocked(userModel.findById).mockReturnValue({
      select: jest.fn().mockResolvedValue(fakeUser as never),
    } as never)

    const mockQuery = makeMockQuery([])
    jest.mocked(resultModel.find).mockReturnValue(mockQuery as never)

    await gameService.getStats(userId, {
      mode: 'lastN',
      lastN: 50,
      minScore: 200,
    })

    expect(resultModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ score: { $gte: 200 } }),
    )
  })
})
