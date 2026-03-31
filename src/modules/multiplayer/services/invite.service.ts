import Invite from '../models/Invite'
import User from '../../../models/userModel'
import { presenceService } from '../../../socket/services/presence.service'

import type {
  BasicUser,
  InviteReceivedPayload,
  InviteStatusPayload,
} from '../types/multiplayer.types'

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

    if (!presenceService.isUserOnline(toUserId)) {
      throw new Error('Target user is not online')
    }

    // prevent duplicate pending invites between the same pair in either direction
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

    const invite = await Invite.create({ fromUserId, toUserId })

    const senderUser = await User.findById(fromUserId).select('name')
    const fromUser: BasicUser = {
      id: fromUserId,
      username: senderUser?.name ?? 'Unknown',
    }

    return {
      inviteId: invite._id.toString(),
      fromUser,
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

    invite.status = 'declined'
    await invite.save()

    return {
      inviteId: invite._id.toString(),
      status: 'declined',
      fromUserId: invite.fromUserId,
      toUserId: invite.toUserId,
    }
  }
}

export const inviteService = new InviteService()
