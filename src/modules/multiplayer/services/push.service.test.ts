import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals'
import * as webpush from 'web-push'

import { pushService } from './push.service'
import PushSubscription from '../models/PushSubscription'

import type { InviteReceivedPayload } from '../types/multiplayer.types'

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}))

jest.mock('../models/PushSubscription', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    deleteMany: jest.fn(),
  },
}))

const invite: InviteReceivedPayload = {
  inviteId: 'invite-1',
  fromUser: { id: 'user-1', username: 'Alice' },
  expiresAt: '2026-01-01T00:05:00.000Z',
}

function makeSubscription(endpoint: string) {
  return { endpoint, keys: { p256dh: 'p256dh-key', auth: 'auth-key' } }
}

function mockSubscriptions(
  subscriptions: ReturnType<typeof makeSubscription>[],
) {
  jest.mocked(PushSubscription.find).mockReturnValue({
    lean: jest.fn().mockResolvedValue(subscriptions as never),
  } as never)
}

describe('pushService.sendInvitePush', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.VAPID_SUBJECT = 'mailto:test@example.com'
    process.env.VAPID_PUBLIC_KEY = 'public-key'
    process.env.VAPID_PRIVATE_KEY = 'private-key'

    // vapid config is cached per instance, reset it so each test starts clean
    ;(
      pushService as unknown as { isVapidConfigured: boolean | undefined }
    ).isVapidConfigured = undefined

    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    jest.restoreAllMocks()
  })

  it('sends the invite payload to every subscription with the invite TTL', async () => {
    mockSubscriptions([
      makeSubscription('https://push.example/a'),
      makeSubscription('https://push.example/b'),
    ])
    jest.mocked(webpush.sendNotification).mockResolvedValue({} as never)

    await pushService.sendInvitePush('user-2', invite)

    expect(webpush.sendNotification).toHaveBeenCalledTimes(2)

    const [subscription, payload, options] = jest.mocked(
      webpush.sendNotification,
    ).mock.calls[0]
    expect(subscription.endpoint).toBe('https://push.example/a')
    expect(options).toEqual({ TTL: 300 })
    expect(JSON.parse(payload as string)).toMatchObject({
      type: 'GAME_INVITE',
      inviteId: 'invite-1',
      senderName: 'Alice',
      expiresAt: invite.expiresAt,
    })
  })

  it('deletes only stale subscriptions (410) and does not throw on other failures', async () => {
    mockSubscriptions([
      makeSubscription('https://push.example/gone'),
      makeSubscription('https://push.example/broken'),
    ])
    jest
      .mocked(webpush.sendNotification)
      .mockRejectedValueOnce({ statusCode: 410 })
      .mockRejectedValueOnce({ statusCode: 500 })

    await expect(
      pushService.sendInvitePush('user-2', invite),
    ).resolves.toBeUndefined()

    expect(PushSubscription.deleteMany).toHaveBeenCalledWith({
      endpoint: { $in: ['https://push.example/gone'] },
    })
  })

  it('does nothing when VAPID keys are not configured', async () => {
    delete process.env.VAPID_PRIVATE_KEY

    await pushService.sendInvitePush('user-2', invite)

    expect(PushSubscription.find).not.toHaveBeenCalled()
    expect(webpush.sendNotification).not.toHaveBeenCalled()
  })
})
