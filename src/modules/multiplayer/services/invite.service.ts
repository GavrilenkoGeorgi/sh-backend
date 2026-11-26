import Invite, { type InviteDocument } from '../models/Invite'
import User from '../../../models/userModel'
import { INVITE_TTL_MS } from '../../../constants/invite'
import { INVITABLE_SEARCH_MIN_LENGTH } from '../../../schemas/invite.schema'
import { presenceService } from '../../../socket/services/presence.service'

import type {
  InvitableUser,
  InviteReceivedPayload,
  OutgoingInvitePayload,
  InviteStatusPayload,
} from '../types/multiplayer.types'

const INVITABLE_SEARCH_LIMIT = 20

// user input goes into a regex, so special characters must be literal
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// pending invites without expiresAt predate expiry and never expire
function buildNotExpiredFilter(now: Date) {
  return {
    $or: [{ expiresAt: { $gt: now } }, { expiresAt: { $exists: false } }],
  }
}

class InviteService {
  async sendInvite(
    fromUserId: string,
    toUserId: string,
  ): Promise<InviteReceivedPayload> {
    if (fromUserId === toUserId) {
      throw new Error('Cannot invite yourself')
    }

    const targetUser = await User.findById(toUserId).select('name')
    if (!targetUser) {
      throw new Error('Target user does not exist')
    }

    // expired invites must not block a new invite between the same users
    await Invite.updateMany(
      {
        status: 'pending',
        expiresAt: { $lte: new Date() },
        $or: [
          { fromUserId, toUserId },
          { fromUserId: toUserId, toUserId: fromUserId },
        ],
      },
      { status: 'expired' },
    )

    const existingPendingInvite = await Invite.findOne({
      status: 'pending',
      $or: [
        { fromUserId, toUserId },
        { fromUserId: toUserId, toUserId: fromUserId },
      ],
    })

    if (existingPendingInvite) {
      throw new Error('A pending invite already exists between these users')
    }

    const invite = await Invite.create({
      fromUserId,
      toUserId,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    })

    const senderUser = await User.findById(fromUserId).select('name')

    return {
      inviteId: invite._id.toString(),
      fromUser: {
        id: fromUserId,
        username: senderUser?.name ?? 'Unknown',
      },
      expiresAt: invite.expiresAt?.toISOString(),
    }
  }

  async acceptInvite(
    inviteId: string,
    acceptingUserId: string,
  ): Promise<InviteStatusPayload & { fromUserId: string; toUserId: string }> {
    const invite = await Invite.findById(inviteId)
    if (!invite) {
      throw new Error('Invite not found')
    }

    if (invite.status !== 'pending') {
      throw new Error('Invite is no longer pending')
    }

    if (invite.toUserId !== acceptingUserId) {
      throw new Error('Only the invite recipient can accept')
    }

    await this.expireIfOutdated(invite)

    // both users must still be online
    if (!presenceService.isUserOnline(invite.fromUserId)) {
      throw new Error('Inviter is no longer online')
    }

    if (!presenceService.isUserOnline(invite.toUserId)) {
      throw new Error('You are no longer online')
    }

    invite.status = 'accepted'
    await invite.save()

    return {
      inviteId: invite._id.toString(),
      status: 'accepted',
      fromUserId: invite.fromUserId,
      toUserId: invite.toUserId,
    }
  }

  async declineInvite(
    inviteId: string,
    decliningUserId: string,
  ): Promise<InviteStatusPayload & { fromUserId: string; toUserId: string }> {
    const invite = await Invite.findById(inviteId)

    if (!invite) {
      throw new Error('Invite not found')
    }

    if (invite.status !== 'pending') {
      throw new Error('Invite is no longer pending')
    }

    if (invite.toUserId !== decliningUserId) {
      throw new Error('Only the invite recipient can decline')
    }

    await this.expireIfOutdated(invite)

    invite.status = 'declined'
    await invite.save()

    return {
      inviteId: invite._id.toString(),
      status: 'declined',
      fromUserId: invite.fromUserId,
      toUserId: invite.toUserId,
    }
  }

  async getIncomingPendingInvites(
    userId: string,
  ): Promise<InviteReceivedPayload[]> {
    const incomingInvites = await Invite.find({
      toUserId: userId,
      status: 'pending',
      ...buildNotExpiredFilter(new Date()),
    })
      .select('_id fromUserId createdAt expiresAt')
      .sort({ createdAt: -1 })

    const fromUserIds = Array.from(
      new Set(incomingInvites.map((invite) => invite.fromUserId)),
    )

    const usernamesByUserId = await this.getUsernamesByUserIds(fromUserIds)

    return incomingInvites.map((invite) => ({
      inviteId: invite._id.toString(),
      fromUser: {
        id: invite.fromUserId,
        username: usernamesByUserId.get(invite.fromUserId) ?? 'Unknown',
      },
      expiresAt: invite.expiresAt?.toISOString(),
    }))
  }

  async getOutgoingPendingInvites(
    userId: string,
  ): Promise<OutgoingInvitePayload[]> {
    const outgoingInvites = await Invite.find({
      fromUserId: userId,
      status: 'pending',
      ...buildNotExpiredFilter(new Date()),
    })
      .select('_id toUserId createdAt')
      .sort({ createdAt: -1 })

    const toUserIds = Array.from(
      new Set(outgoingInvites.map((invite) => invite.toUserId)),
    )

    const usernamesByUserId = await this.getUsernamesByUserIds(toUserIds)

    return outgoingInvites.map((invite) => ({
      inviteId: invite._id.toString(),
      toUser: {
        id: invite.toUserId,
        username: usernamesByUserId.get(invite.toUserId) ?? 'Unknown',
      },
    }))
  }

  // online users are always listed; a search adds registered users matching the name prefix,
  // so offline users can still be invited (they get a web push)
  async getInvitableUsers(
    userId: string,
    search?: string,
  ): Promise<InvitableUser[]> {
    const usersById = new Map<string, InvitableUser>()

    for (const onlineUser of presenceService.getOnlineUsers()) {
      if (onlineUser.userId !== userId) {
        usersById.set(onlineUser.userId, { ...onlineUser, online: true })
      }
    }

    const searchPrefix = search?.trim()

    if (searchPrefix && searchPrefix.length >= INVITABLE_SEARCH_MIN_LENGTH) {
      const matchedUsers = await User.find({
        _id: { $ne: userId },
        isActivated: true,
        name: {
          $regex: `^${escapeRegex(searchPrefix)}`,
          $options: 'i',
        },
      })
        .select('name')
        .sort({ name: 1 })
        .limit(INVITABLE_SEARCH_LIMIT)
        .lean()

      for (const matchedUser of matchedUsers) {
        const matchedUserId = matchedUser._id.toString()
        usersById.set(matchedUserId, {
          userId: matchedUserId,
          username: matchedUser.name,
          online: presenceService.isUserOnline(matchedUserId),
        })
      }
    }

    return Array.from(usersById.values()).sort((firstUser, secondUser) =>
      firstUser.username.localeCompare(secondUser.username),
    )
  }

  // lazy expiry: no cron, so stale invites are closed when someone touches them
  private async expireIfOutdated(invite: InviteDocument): Promise<void> {
    if (!invite.expiresAt || invite.expiresAt > new Date()) {
      return
    }

    invite.status = 'expired'
    await invite.save()
    throw new Error('Invite has expired')
  }

  private async getUsernamesByUserIds(
    userIds: string[],
  ): Promise<Map<string, string>> {
    if (userIds.length === 0) {
      return new Map<string, string>()
    }

    const users = await User.find({ _id: { $in: userIds } })
      .select('name')
      .lean()

    return new Map<string, string>(
      users.map((user) => [user._id.toString(), user.name]),
    )
  }
}

export const inviteService = new InviteService()
