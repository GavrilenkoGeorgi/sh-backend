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
