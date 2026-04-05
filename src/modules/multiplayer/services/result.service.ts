import MultiplayerResult from '../models/MultiplayerResult'

class MultiplayerResultService {
  async getUserResults(userId: string) {
    return MultiplayerResult.find({ playerId: userId })
      .sort({ createdAt: -1 })
      .lean()
  }
}

export const multiplayerResultService = new MultiplayerResultService()
