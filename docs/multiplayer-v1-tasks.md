# Multiplayer V1 Tasks

This checklist follows `/docs/multiplayer-v1-spec.md`.

## How to use this file

- Work top to bottom.
- Complete one phase before moving to the next.
- Keep backend and frontend changes aligned with the spec.
- Do not implement future phases early.

---

## Phase 1 — Backend socket foundation

- [ ] Add Socket.IO to the Express backend.
- [ ] Add socket authentication using the existing login/session/JWT flow.
- [ ] Reject unauthenticated socket connections.
- [ ] Create a modular socket bootstrap file.
- [ ] Create a socket auth middleware file.
- [ ] Create a presence handler/service skeleton.

### Done when

- An authenticated user can connect through Socket.IO.
- Unauthenticated connections are rejected.
- The socket layer is isolated from REST routes.

### Copilot prompt

> Read `/docs/multiplayer-v1-spec.md` and implement Backend Phase 1 only. Add Socket.IO with authenticated connections using the existing auth flow. Create modular socket bootstrap and auth middleware files. Do not implement invites or game logic yet.

---

## Phase 2 — Backend presence tracking

- [ ] Track connected users in memory by userId and socketId.
- [ ] Treat a user as online if they have at least one active socket.
- [ ] Broadcast `presence:online-users` to authenticated sockets.
- [ ] Recompute online users on connect and disconnect.
- [ ] Keep duplicate tabs allowed for V1.

### Done when

- Online users are broadcast reliably.
- A user appears once even if they have multiple tabs.
- Disconnect removes the user only when all sockets are gone.

### Copilot prompt

> Read `/docs/multiplayer-v1-spec.md` and implement Backend Phase 2 only. Track authenticated connected users in memory and broadcast `presence:online-users` updates on connect/disconnect. Keep the implementation in a dedicated presence service.

---

## Phase 3 — Frontend socket foundation

- [ ] Install and configure `socket.io-client`.
- [ ] Create a multiplayer socket singleton/service.
- [ ] Create a dedicated multiplayer React Redux store.
- [ ] Track socket connection status in the store.
- [ ] Listen for `presence:online-users`.
- [ ] Keep multiplayer state separate from offline/local game state.

### Done when

- The frontend connects to the backend socket.
- Connection status is visible in state.
- Online users are stored in React Redux.

### Copilot prompt

> Read `/docs/multiplayer-v1-spec.md` and implement Frontend Phase 3 only. Add a multiplayer socket client, a dedicated React Redux store, and listeners for connection status and `presence:online-users`. Do not implement invite UI yet.

---

## Phase 4 — Frontend online users list

- [ ] Build a minimal lobby view for online users.
- [ ] Exclude the current user from the list.
- [ ] Add an Invite action next to each user.
- [ ] Wire UI to the multiplayer React Redux store.

### Done when

- The user can see other online players.
- The UI is minimal and usable.
- The list updates in real time.

### Copilot prompt

> Read `/docs/multiplayer-v1-spec.md` and implement Frontend Phase 4 only. Build the online users list UI and connect it to the multiplayer React Redux store. Add an Invite button for each other online user.

---

## Phase 5 — Backend invite flow

- [ ] Add an Invite model.
- [ ] Implement `invite:send`.
- [ ] Implement `invite:accept`.
- [ ] Implement `invite:decline`.
- [ ] Add invite status updates.
- [ ] Validate that the target user is online.
- [ ] Prevent duplicate pending invites between the same two users.
- [ ] Prevent inviting yourself.

### Done when

- User A can send an invite to User B.
- User B receives the invite.
- Accept and decline update invite state correctly.

### Copilot prompt

> Read `/docs/multiplayer-v1-spec.md` and implement Backend Phase 5 only. Add invite persistence and Socket.IO invite events for send/accept/decline. Validate online status and prevent duplicate pending invites.

---

## Phase 6 — Frontend invite UI

- [ ] Render incoming invites.
- [ ] Add Accept action.
- [ ] Add Decline action.
- [ ] Emit the correct invite socket events.
- [ ] Update the store when invite status changes.

### Done when

- Incoming invites are visible.
- Accept and decline work end to end.
- Pending invites are cleaned up correctly.

### Copilot prompt

> Read `/docs/multiplayer-v1-spec.md` and implement Frontend Phase 6 only. Add UI for incoming invites with Accept and Decline actions. Emit the corresponding socket events and update the multiplayer store.

---

## Phase 7 — Backend game creation

- [ ] Add a MultiplayerGame model.
- [ ] Create a game when an invite is accepted.
- [ ] Set the inviter as player1.
- [ ] Set the invited user as player2.
- [ ] Set the invited user to start first.
- [ ] Join both sockets to the same game room.
- [ ] Emit `game:started` to both players.

### Done when

- Accepting an invite creates a game.
- Both players receive the initial game state.
- The invited user is the first active player.

### Copilot prompt

> Read `/docs/multiplayer-v1-spec.md` and implement Backend Phase 7 only. Create a multiplayer game when an invite is accepted, join both players to the game room, set the invited user to start first, and emit `game:started`.

---

## Phase 8 — Frontend multiplayer game screen

- [ ] Add a multiplayer game board component.
- [ ] Render the shared game state from the store.
- [ ] Show whose turn it is.
- [ ] Show both players’ confirmed scorecards and totals.
- [ ] Show an active-player view and a waiting-player view.
- [ ] Keep the game screen separate from offline/local mode.

### Done when

- The game board renders from server state.
- The current player and opponent are clear.
- Waiting state and active state are distinct.

### Copilot prompt

> Read `/docs/multiplayer-v1-spec.md` and implement Frontend Phase 8 only. Build the multiplayer game board UI that renders the shared game state, shows turn ownership, and distinguishes active-player and waiting-player views.

---

## Phase 9 — Frontend local turn state

- [ ] Keep temporary dice state local to the game board or a dedicated hook.
- [ ] Keep selected dice local.
- [ ] Keep category selection local.
- [ ] Keep preview score local.
- [ ] Do not store temporary turn state in the shared multiplayer game snapshot.

### Done when

- Temporary turn UI state stays separate from server-confirmed game state.
- The shared game snapshot remains clean and serializable.

### Copilot prompt

> Read `/docs/multiplayer-v1-spec.md` and implement Frontend Phase 9 only. Add local turn state for dice, selected dice, category selection, and preview score. Keep this state separate from the shared multiplayer game snapshot.

---

## Phase 10 — Backend turn submission

- [ ] Implement `game:submit-turn`.
- [ ] Validate game existence.
- [ ] Validate turn ownership.
- [ ] Validate game status.
- [ ] Validate category legality and unused category.
- [ ] Validate dice shape and values (1 to 5 integers, each 1..6).
- [ ] Validate score range sanity.
- [ ] Update the scorecard and total score.
- [ ] Append the move to history.
- [ ] Switch turn to the other player.
- [ ] Broadcast `game:state-updated`.

### Done when

- One completed turn can be submitted successfully.
- The turn changes to the other player.
- Both clients receive the updated state.

### Copilot prompt

> Read `/docs/multiplayer-v1-spec.md` and implement Backend Phase 10 only. Add `game:submit-turn` validation and turn application logic. Validate turn ownership, category legality, dice shape, and score range. Update the game state and emit `game:state-updated`.

---

## Phase 11 — Frontend turn submission

- [ ] Reuse existing frontend scoring logic.
- [ ] Add a Submit Turn action.
- [ ] Send `game:submit-turn` with the finalized move only.
- [ ] Reset local turn UI state after a successful submit.
- [ ] Update the shared state from `game:state-updated`.

### Done when

- A full local turn can be submitted to the server.
- The UI resets cleanly after submit.
- The opponent sees the updated state and their turn begins.

### Copilot prompt

> Read `/docs/multiplayer-v1-spec.md` and implement Frontend Phase 11 only. Reuse the existing local scoring logic, add a Submit Turn action, and send a finalized move to `game:submit-turn`. Reset local turn state after success.

---

## Phase 12 — Backend game completion

- [ ] Detect when both players have used all categories.
- [ ] Mark the game as finished.
- [ ] Compute the winner from total scores.
- [ ] Persist the final result.
- [ ] Emit `game:ended`.

### Done when

- A complete game ends automatically.
- The winner or tie is determined correctly.
- Final results are saved.

### Copilot prompt

> Read `/docs/multiplayer-v1-spec.md` and implement Backend Phase 12 only. Detect game completion, compute the winner, persist the result, and emit `game:ended`.

---

## Phase 13 — Frontend game end handling

- [ ] Listen for `game:ended`.
- [ ] Show the final result.
- [ ] Show disconnect/end reason if applicable.
- [ ] Clear active multiplayer session state after dismissal.
- [ ] Return the user to the lobby.

### Done when

- The end screen appears reliably.
- The user can leave the finished game cleanly.
- Multiplayer state resets correctly.

### Copilot prompt

> Read `/docs/multiplayer-v1-spec.md` and implement Frontend Phase 13 only. Handle `game:ended`, show the result, clear multiplayer session state, and return to the lobby.

---

## Phase 14 — Backend disconnect handling

- [ ] Detect disconnects for players in active games.
- [ ] End the active game immediately.
- [ ] Mark the game as abandoned or disconnected.
- [ ] Set the remaining player as winner for V1 if desired.
- [ ] Emit `game:ended` to the remaining player.

### Done when

- Disconnecting during an active game ends that game immediately.
- The remaining player receives the correct end event.

### Copilot prompt

> Read `/docs/multiplayer-v1-spec.md` and implement Backend Phase 14 only. If a player disconnects during an active game, end the game immediately and notify the remaining player with `game:ended`.

---

## Phase 15 — Optional bootstrap endpoints

- [ ] Add `GET /multiplayer/online-users`.
- [ ] Optionally add `GET /multiplayer/active-game`.
- [ ] Reuse existing auth middleware.
- [ ] Keep these endpoints minimal and read-only.

### Done when

- The frontend can recover initial state on refresh.
- Real-time updates still come from sockets.

### Copilot prompt

> Read `/docs/multiplayer-v1-spec.md` and implement Backend Phase 15 only. Add minimal bootstrap endpoints for online users and optionally the current active game. Keep real-time updates socket-driven.

---

## Final checklist before declaring V1 usable

- [ ] Users can connect through Socket.IO.
- [ ] Online users are visible.
- [ ] Direct invites work.
- [ ] Invite accept starts a game.
- [ ] Invited user starts first.
- [ ] One completed turn can be submitted.
- [ ] Turn ownership switches correctly.
- [ ] Game ends on completion.
- [ ] Game ends on disconnect.
- [ ] Multiplayer state stays separate from offline mode.

---

## Notes

- Keep backend and frontend event names identical.
- Keep category keys identical to the existing scoring system.
- Use only the existing keys: `ones`, `twos`, `threes`, `fours`, `fives`, `sixes`, `pair`, `twoPairs`, `triple`, `full`, `quads`, `poker`, `small`, `large`, `chance`.
- Do not introduce alternate naming (for example `threeOfAKind`, `fullHouse`, `smallStraight`, `yahtzee`).
- Keep the spec file and this task file in sync.
- Do not expand scope until V1 is fully playable.
