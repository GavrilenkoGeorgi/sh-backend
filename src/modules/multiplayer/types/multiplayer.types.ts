// TODO: revise these types, they look similar
// shared multiplayer types matching the spec contract
export interface BasicUser {
  id: string
  username: string
}

export interface OnlineUser {
  userId: string
  username: string
}

// socket.data.user shape attached during authentication
export interface SocketUser {
  id: string
  username: string
}

// invite statuses
export type InviteStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'expired'

// client -> server payloads
export interface InviteSendPayload {
  toUserId: string
}

export interface InviteAcceptPayload {
  inviteId: string
}

export interface InviteDeclinePayload {
  inviteId: string
}

// server -> client payloads
export interface InviteReceivedPayload {
  inviteId: string
  fromUser: BasicUser
}

export interface InviteStatusPayload {
  inviteId: string
  status: 'accepted' | 'declined' | 'cancelled' | 'expired'
}

// rest bootstrap payloads
export interface OutgoingInvitePayload {
  inviteId: string
  toUser: BasicUser
}
