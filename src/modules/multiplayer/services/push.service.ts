import * as webpush from 'web-push'

import PushSubscription from '../models/PushSubscription'
import { INVITE_TTL_MS } from '../../../constants/invite'

import type { InviteReceivedPayload } from '../types/multiplayer.types'

interface SubscriptionInput {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

// push services report dead subscriptions with these statuses
const STALE_SUBSCRIPTION_STATUSES = [404, 410]
const INVITE_PUSH_TTL_SECONDS = INVITE_TTL_MS / 1000
const INVITE_PUSH_URL = '/multiplayer'

function readStatusCode(reason: unknown): number | undefined {
  if (
    typeof reason === 'object' &&
    reason !== null &&
    'statusCode' in reason &&
    typeof reason.statusCode === 'number'
  ) {
    return reason.statusCode
  }

  return undefined
}

class PushService {
  // undefined until the first send, so a missing config never crashes startup
  private isVapidConfigured: boolean | undefined

  // public key is safe to expose; undefined means push is not configured
  getPublicKey(): string | undefined {
    return process.env.VAPID_PUBLIC_KEY || undefined
  }

  // endpoint is unique per browser, so re-subscribing under another account reassigns it
  async saveSubscription(
    userId: string,
    subscription: SubscriptionInput,
    userAgent?: string,
  ): Promise<void> {
    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        userId,
        keys: subscription.keys,
        userAgent,
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    )
  }

  async removeSubscription(userId: string, endpoint: string): Promise<void> {
    await PushSubscription.deleteOne({ endpoint, userId })
  }

  // never throws: a failed push must not break the invite flow
  async sendInvitePush(
    toUserId: string,
    invite: InviteReceivedPayload,
  ): Promise<void> {
    try {
      if (!this.ensureVapidConfigured()) {
        return
      }

      const subscriptions = await PushSubscription.find({
        userId: toUserId,
      }).lean()

      if (subscriptions.length === 0) {
        return
      }

      const payload = JSON.stringify({
        type: 'GAME_INVITE',
        inviteId: invite.inviteId,
        senderName: invite.fromUser.username,
        expiresAt: invite.expiresAt,
        url: `${INVITE_PUSH_URL}?inviteId=${invite.inviteId}`,
      })

      const results = await Promise.allSettled(
        subscriptions.map((subscription) =>
          webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
              },
            },
            payload,
            { TTL: INVITE_PUSH_TTL_SECONDS },
          ),
        ),
      )

      const staleEndpoints: string[] = []

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          return
        }

        const statusCode = readStatusCode(result.reason)
        if (
          statusCode !== undefined &&
          STALE_SUBSCRIPTION_STATUSES.includes(statusCode)
        ) {
          staleEndpoints.push(subscriptions[index].endpoint)
          return
        }

        // log status only, the error can carry the subscription endpoint
        console.error('failed to send invite push', statusCode)
      })

      if (staleEndpoints.length > 0) {
        await PushSubscription.deleteMany({ endpoint: { $in: staleEndpoints } })
      }
    } catch (error) {
      console.error('failed to process invite push', error)
    }
  }

  private ensureVapidConfigured(): boolean {
    if (this.isVapidConfigured !== undefined) {
      return this.isVapidConfigured
    }

    const { VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env

    if (!VAPID_SUBJECT || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.warn('VAPID keys are missing, web push is disabled')
      this.isVapidConfigured = false
      return false
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    this.isVapidConfigured = true
    return true
  }
}

export const pushService = new PushService()
