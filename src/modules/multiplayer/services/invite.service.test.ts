import { describe, it, expect, jest } from '@jest/globals'

import { inviteService } from './invite.service'
import Invite from '../models/Invite'
import User from '../../../models/userModel'
import { presenceService } from '../../../socket/services/presence.service'

jest.mock('../models/Invite', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
}))

jest.mock('../../../models/userModel', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}))

jest.mock('../../../socket/services/presence.service', () => ({
  presenceService: {
    isUserOnline: jest.fn(),
  },
}))

function mockUserLookup(name: string) {
  jest.mocked(User.findById).mockReturnValue({
    select: jest.fn().mockResolvedValue({ name } as never),
  } as never)
}

describe('inviteService.sendInvite', () => {
  it('allows inviting an offline user and returns the invite expiry', async () => {
    const expiresAt = new Date('2026-01-01T00:05:00.000Z')
    mockUserLookup('Bob')
    jest.mocked(presenceService.isUserOnline).mockReturnValue(false)
    jest.mocked(Invite.updateMany).mockResolvedValue({} as never)
    jest.mocked(Invite.findOne).mockResolvedValue(null as never)
    jest
      .mocked(Invite.create)
      .mockResolvedValue({ _id: 'invite-1', expiresAt } as never)

    const result = await inviteService.sendInvite('user-1', 'user-2')

    expect(result.inviteId).toBe('invite-1')
    expect(result.expiresAt).toBe(expiresAt.toISOString())
    expect(Invite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        expiresAt: expect.any(Date),
      }),
    )
  })
})

describe('inviteService expired invites', () => {
  const methods = [
    ['acceptInvite', inviteService.acceptInvite.bind(inviteService)],
    ['declineInvite', inviteService.declineInvite.bind(inviteService)],
  ] as const

  it.each(methods)(
    '%s marks an outdated invite as expired and rejects',
    async (_name, respond) => {
      const invite = {
        _id: 'invite-1',
        status: 'pending',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        expiresAt: new Date(Date.now() - 1000),
        save: jest.fn(),
      }
      jest.mocked(Invite.findById).mockResolvedValue(invite as never)

      await expect(respond('invite-1', 'user-2')).rejects.toThrow(
        'Invite has expired',
      )

      expect(invite.status).toBe('expired')
      expect(invite.save).toHaveBeenCalled()
    },
  )
})
