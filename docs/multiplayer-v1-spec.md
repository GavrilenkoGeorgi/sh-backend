# Multiplayer V1 Spec

## Purpose

This document is the source of truth for Multiplayer V1 implementation.

All backend and frontend implementations must follow this spec exactly for:

- Socket event names
- Socket payload shapes
- Multiplayer game state shape
- Invite flow
- Turn submission flow
- Disconnect behavior
- Validation rules

This file should exist in both the frontend and backend repositories and stay manually synchronized.

---

# Scope (V1)

## Included in V1

- 1v1 multiplayer only
- Direct invites only
- Authenticated users only
- Online users list
- Send / receive / accept / decline invites
- Invited user always starts first
- Turn-based game flow
- Client computes score locally using existing frontend logic
- Server validates turn structure and basic legality only
- Server is authoritative for turn order and game progression
- Server broadcasts updated game state after each completed turn
- If a player disconnects during an active game, the game ends immediately
- Final multiplayer results are persisted
- School phase: each player must save all 6 school categories before game categories become available
- If a player cannot score any school category at max rolls, the game ends immediately with that player losing

## Explicitly NOT included in V1

- Matchmaking
- Spectators
- In-game chat
- Reconnect/resume active game
- Live syncing of every roll or dice selection
- Server-authoritative score calculation
- Anti-cheat beyond basic validation
- Multi-tab conflict resolution beyond "user is online if at least one socket is connected"

---

# Tech Decisions

## Backend

- Node.js
- Express
- MongoDB
- Socket.IO

## Frontend

- React 19
- React Redux for live multiplayer state
- RTK Query for optional bootstrap endpoints
- socket.io-client

## Important Design Rule

The frontend must NOT send every roll/select action to the backend in V1.

Instead:

- The active player performs their full turn locally
- At the end of the turn, the client submits ONE finalized move
- The server validates turn ownership + category legality + basic score range
- The server updates the authoritative multiplayer game state
- The server broadcasts the updated state to both players

---

# High-Level Flow

1. Authenticated user connects via Socket.IO
2. Backend authenticates socket connection
3. Backend tracks online users
4. Frontend shows online users list
5. User A invites User B
6. User B accepts
7. Backend creates multiplayer game
8. Invited user starts first
9. Active player completes turn locally
10. Active player submits finalized move
11. Backend validates and updates game state
12. Backend switches turn and broadcasts updated state
13. Repeat until all categories are used by both players
14. Backend computes winner, saves result, and emits game end
15. If any player disconnects during active game, game ends immediately

---

# Multiplayer Modes

## Offline / Local mode

Existing offline/local mode remains separate and should continue to work without auth.

## Multiplayer mode

Multiplayer mode uses:

- separate orchestration
- shared presentational UI where possible
- shared scoring helpers where possible
- separate store / session state from offline mode

IMPORTANT:
Do NOT merge offline/local game store and multiplayer game store.

---

# Shared Constants

## Multiplayer status

```ts
type MultiplayerGameStatus = 'active' | 'finished' | 'abandoned'
```

## Invite status

```ts
type InviteStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'expired'
```

## Game end reason

```ts
type GameEndReason = 'completed' | 'opponent_disconnected' | 'school_incomplete'
```

---

# Socket Event Contract

All event names below are part of the contract and must match exactly.

---

## Presence

### Server -> Client

Event:

```ts
'presence:online-users'
```

Payload:

```ts
interface PresenceOnlineUsersPayload {
  users: OnlineUser[]
}
```

---

## Invites

### Client -> Server

Event:

```ts
'invite:send'
```

Payload:

```ts
interface InviteSendPayload {
  toUserId: string
}
```

### Server -> Client (target user)

Event:

```ts
'invite:received'
```

Payload:

```ts
interface InviteReceivedPayload {
  inviteId: string
  fromUser: BasicUser
}
```

### Client -> Server

Event:

```ts
'invite:accept'
```

Payload:

```ts
interface InviteAcceptPayload {
  inviteId: string
}
```

### Client -> Server

Event:

```ts
'invite:decline'
```

Payload:

```ts
interface InviteDeclinePayload {
  inviteId: string
}
```

### Server -> Client (both users)

Event:

```ts
'invite:status'
```

Payload:

```ts
interface InviteStatusPayload {
  inviteId: string
  status: 'accepted' | 'declined' | 'cancelled' | 'expired'
}
```

---

## Game lifecycle

### Server -> Client (both users)

Event:

```ts
'game:started'
```

Payload:

```ts
interface GameStartedPayload {
  gameId: string
  currentTurnPlayerId: string
  opponent: BasicUser
  gameState: MultiplayerGameState
}
```

### Client -> Server

Event:

```ts
'game:submit-turn'
```

Payload:

```ts
interface GameSubmitTurnPayload {
  gameId: string
  move: TurnMoveInput
}
```

### Server -> Client (both users)

Event:

```ts
'game:state-updated'
```

Payload:

```ts
interface GameStateUpdatedPayload {
  gameId: string
  gameState: MultiplayerGameState
}
```

### Server -> Client (both users or remaining user)

Event:

```ts
'game:ended'
```

Payload:

```ts
interface GameEndedPayload {
  gameId: string
  reason: GameEndReason
  winnerId?: string | null
  gameState?: MultiplayerGameState
}
```

---

# Shared Type Definitions

These types should be mirrored in both repos.

## Basic user

```ts
interface BasicUser {
  id: string
  username: string
}
```

## Online user

```ts
interface OnlineUser {
  userId: string
  username: string
}
```

## Category key

IMPORTANT:
Use the exact category keys that already exist in the current frontend codebase.
Do NOT rename these keys in V1.

```ts
type SchoolCombination =
  | 'ones'
  | 'twos'
  | 'threes'
  | 'fours'
  | 'fives'
  | 'sixes'

type GameCombination =
  | 'pair'
  | 'twoPairs'
  | 'triple'
  | 'full'
  | 'quads'
  | 'poker'
  | 'small'
  | 'large'
  | 'chance'

type ScoreCategory = SchoolCombination | GameCombination
```

These names match the existing `SchoolCombinations` and `GameCombinations` values.
Do not introduce alternate names like `threeOfAKind`, `fullHouse`, or `yahtzee`.

---

## Per-player multiplayer score state

```ts
interface MultiplayerPlayerState {
  totalScore: number
  usedCategories: ScoreCategory[]
  scoreCard: Record<ScoreCategory, number | null>
}
```

## Turn move input (client submits this)

```ts
interface TurnMoveInput {
  category: ScoreCategory
  score: number
  dice: number[]
}
```

IMPORTANT:

- `dice` is the selected dice set used for scoring in the submitted move
- allowed length for V1 is `1..5`
- each value must be an integer from `1..6`

## Stored move history item

```ts
interface TurnMoveRecord {
  playerId: string
  category: ScoreCategory
  score: number
  dice: number[]
  createdAt: string
}
```

## Multiplayer game state (shared shape sent to frontend)

```ts
interface MultiplayerGameState {
  gameId: string
  status: MultiplayerGameStatus
  player1Id: string
  player2Id: string
  currentTurnPlayerId: string
  turnNumber: number

  players: Record<string, MultiplayerPlayerState>

  winnerId?: string | null
  endedReason?: 'completed' | 'disconnect' | 'school-incomplete'
}
```

IMPORTANT:

- `players` must contain exactly two keys for the two player IDs
- `currentTurnPlayerId` must always be either `player1Id` or `player2Id`

---

# MongoDB Models (Backend)

## Invite model (recommended shape)

```ts
interface InviteDocument {
  _id: string
  fromUserId: string
  toUserId: string
  status: InviteStatus
  createdAt: Date
  updatedAt: Date
}
```

## Multiplayer game model (recommended shape)

```ts
interface MultiplayerGameDocument {
  _id: string
  status: MultiplayerGameStatus

  player1Id: string
  player2Id: string
  currentTurnPlayerId: string

  players: Record<string, MultiplayerPlayerState>

  turnNumber: number
  moves: TurnMoveRecord[]

  winnerId?: string | null
  endedReason?: 'completed' | 'disconnect'

  createdAt: Date
  updatedAt: Date
}
```

IMPORTANT:

- `player1Id` = inviter
- `player2Id` = invited user
- `currentTurnPlayerId` initially = invited user (`player2Id`)

---

# Presence Rules (Backend)

## Socket auth

- Only authenticated users may connect
- Socket auth must reuse existing backend auth logic if possible
- Unauthenticated socket connections must be rejected

## Online tracking

- A user is considered online if they have at least one active authenticated socket
- Multiple tabs are allowed in V1
- If a user has multiple sockets, they should appear only once in `presence:online-users`

## Broadcast rule

Whenever a user connects or fully disconnects:

- recompute online users
- broadcast `presence:online-users` to all authenticated sockets

---

# Invite Rules

## Validations

On `invite:send`:

- `toUserId` must exist
- `toUserId` must not equal current user ID
- target user must be online
- target user must not already be in an active multiplayer game
- current user must not already be in an active multiplayer game
- there must not already be a pending invite between these two users in either direction

## Accept rules

On `invite:accept`:

- invite must exist
- invite status must be `pending`
- accepting user must be `toUserId`
- both users must still be online
- neither user may already be in an active multiplayer game

If valid:

- set invite status = `accepted`
- create game
- emit `invite:status`
- emit `game:started`

## Decline rules

On `invite:decline`:

- invite must exist
- invite status must be `pending`
- declining user must be `toUserId`

If valid:

- set invite status = `declined`
- emit `invite:status`

---

# Game Creation Rules

When an invite is accepted:

- create a new multiplayer game
- `status = 'active'`
- `player1Id = inviter`
- `player2Id = invited user`
- `currentTurnPlayerId = player2Id` (invited user starts first)
- `turnNumber = 1`
- initialize both players with empty scorecards
- initialize both players with `totalScore = 0`
- initialize both players with `usedCategories = []`
- `moves = []`

## Initial scorecard shape

Each player scorecard must contain all categories initialized to `null`.

Example:

```ts
{
  ones: null,
  twos: null,
  threes: null,
  fours: null,
  fives: null,
  sixes: null,
  pair: null,
  twoPairs: null,
  triple: null,
  full: null,
  quads: null,
  poker: null,
  small: null,
  large: null,
  chance: null
}
```

IMPORTANT:
If the app already uses a different category list, use the existing exact category list instead.

---

# Turn Submission Rules (Core V1)

## Important V1 design

The client does NOT send every roll/select action.

The client sends exactly one finalized move when the player ends their turn.

---

## Client responsibilities

During the active player's turn:

- perform rolls locally
- perform dice selection locally
- compute score locally using existing frontend logic
- choose category locally

At end of turn:

- emit `game:submit-turn`

---

## `game:submit-turn` payload

```ts
{
  gameId: string,
  move: {
    category: ScoreCategory,
    score: number,
    dice: number[] // selected dice values, length 1..5
  }
}
```

---

## Backend validations for `game:submit-turn`

The backend must validate ALL of the following:

1. Game exists
2. Game status is `active`
3. Sender belongs to the game
4. Sender is the current turn player
5. `move.category` is a valid category
6. Category has not already been used by this player
7. `move.dice` contains between 1 and 5 integers
8. Each die value is between 1 and 6 inclusive
9. `move.score` is a finite number
10. `move.score` is within the allowed min/max range for the submitted category

IMPORTANT:
In V1, the backend does NOT fully recompute score from dice.
It only validates:

- payload shape
- category legality
- score range sanity

---

# Score Range Validation (V1)

The backend must validate score ranges per category.

These ranges must follow the current frontend scoring logic.
If scoring logic changes later, frontend and backend must be updated together.

## Upper section

- `ones`: min -2, max 2
- `twos`: min -4, max 4
- `threes`: min -6, max 6
- `fours`: min -8, max 8
- `fives`: min -10, max 10
- `sixes`: min -12, max 12

## Game combinations

- `pair`: min 0, max 12
- `twoPairs`: min 0, max 22
- `triple`: min 0, max 18
- `full`: min 0, max 28
- `quads`: min 0, max 24
- `poker`: min 0, max 110
- `small`: min 0, max 15
- `large`: min 0, max 20
- `chance`: min 1, max 30

IMPORTANT:

- school scoring currently allows negative values by design (`(count - 3) * dieValue`)
- `chance` minimum is `1` with the current selected-dice frontend flow
- Frontend and backend must use the same category list and the same scoring assumptions

---

# School Phase Rules

## Definition

A player is in the **school phase** while fewer than 6 school categories (`ones`–`sixes`) are in their `usedCategories`.

Once all 6 school categories are saved the player moves to the **game phase** and may only save game categories.

## Frontend enforcement

- During the school phase the client only computes and displays preview scores for school categories.
- During the game phase the client only computes and displays preview scores for game categories.
- Determination is based on: `usedSchoolCategories.length < 6` (counts school categories already in `usedCategories`).

## School failure

School failure occurs when, after the 3rd roll of a school-phase turn, none of the remaining school categories has any dice that produce a non-null school score.

When school failure is detected the client emits `game:school-failed`.

### `game:school-failed` payload

```ts
{
  gameId: string
}
```

### Backend handling

On `game:school-failed`:

1. Validate:
   - game exists and is `active`
   - sender belongs to the game and is the current turn player
   - the sending player is still in the school phase (`usedSchoolCategories.length < 6`)
2. End the game:
   - set `status = 'finished'`
   - set `winnerId = opponentId`
   - set `endedReason = 'school-incomplete'`
3. Persist the final state
4. Emit `game:ended` to both players

---

# Turn Application Rules (Backend)

If `game:submit-turn` passes validation:

1. Write submitted score into that player's `scoreCard[category]`
2. Append category to that player's `usedCategories`
3. Recompute that player's `totalScore` from the scorecard OR increment by submitted score
   - Recommended: recompute from scorecard for safety
4. Append a move record to `moves`
5. Determine if the game is complete
6. If not complete:
   - switch `currentTurnPlayerId` to the other player
   - increment `turnNumber`
7. Save updated game document
8. Emit `game:state-updated` to both players

IMPORTANT:

- The backend is authoritative for whose turn it is
- The frontend must always replace its shared multiplayer state with the latest server state

---

# Game Completion Rules

## Normal completion

The game is complete when:

- BOTH players have used ALL allowed score categories

Equivalent check:

- `usedCategories.length === TOTAL_CATEGORY_COUNT` for both players

When complete:

1. Set `status = 'finished'`
2. Compare `totalScore` values
3. Set `winnerId`
   - If scores are equal, `winnerId = null` (tie)
4. Set `endedReason = 'completed'`
5. Persist final result
6. Emit `game:ended`

## School-incomplete end

Triggered by `game:school-failed` (see School Phase Rules above).

When the school failure is validated:

1. Set `status = 'finished'`
2. Set `winnerId = opponentId` (the player who did NOT fail)
3. Set `endedReason = 'school-incomplete'`
4. Persist final result
5. Emit `game:ended`

IMPORTANT:
The frontend should treat `game:ended` as final and exit the active multiplayer session after displaying the result.

---

# Disconnect Rules (V1)

If a player disconnects while in an active multiplayer game:

1. Find active game(s) for that user
2. Set `status = 'abandoned'`
3. Set `endedReason = 'disconnect'`
4. Optionally set `winnerId` to the remaining connected player
   - Recommended for V1: remaining player wins
5. Persist final game state
6. Emit `game:ended` to the remaining connected player with:
   - `reason = 'opponent_disconnected'`

IMPORTANT:
V1 does NOT support reconnect/resume.
A disconnect during active game always ends the game.

---

# Frontend State Architecture

## React Redux store (multiplayer only)

Recommended fields:

```ts
interface MultiplayerStoreState {
  socketConnected: boolean
  onlineUsers: OnlineUser[]

  incomingInvites: Array<{
    inviteId: string
    fromUser: BasicUser
  }>

  outgoingInvites: Array<{
    inviteId: string
    toUserId: string
  }>

  activeGameId: string | null
  activeGame: MultiplayerGameState | null

  lastError: string | null
}
```

IMPORTANT:
This store is for live multiplayer session state only.

---

## Local turn UI state (frontend only)

This state should NOT be stored inside `activeGame`.

Recommended local state:

- current dice values for the active turn
- selected dice indices
- selected category
- computed preview score

This can live:

- inside `MultiplayerGameBoard`
- or inside a dedicated `useMultiplayerTurnState` hook

IMPORTANT:
Temporary per-turn UI state must remain separate from the server-confirmed shared game state.

---

# Frontend Rendering Rules

## Active player view

If current user ID equals `currentTurnPlayerId`:

- show interactive turn controls
- allow roll / select / choose category / submit turn

## Waiting player view

If current user ID does NOT equal `currentTurnPlayerId`:

- show read-only board
- show waiting indicator
- disable all turn actions

IMPORTANT:
The waiting player should NOT see or interact with the other player's temporary local turn state in V1.

Only confirmed turn results are shared after submission.

---

# Frontend Socket Rules

## On connect

- mark `socketConnected = true`

## On disconnect

- mark `socketConnected = false`

## On `presence:online-users`

- replace `onlineUsers` in store

## On `invite:received`

- add to `incomingInvites`

## On `invite:status`

- remove or update matching pending invites
- if accepted, frontend may wait for `game:started`

## On `game:started`

- set `activeGameId`
- set `activeGame`
- navigate/render multiplayer board

## On `game:state-updated`

- replace `activeGame` entirely with latest server snapshot
- if current user is no longer active player, ensure local turn UI becomes inactive/reset

## On `game:ended`

- show final message
- clear active multiplayer session after dismiss
- return to lobby

---

# Optional REST Endpoints (Recommended but Minimal)

These are optional V1 bootstrap endpoints.

## GET `/multiplayer/online-users`

Returns:

```ts
{
  users: OnlineUser[]
}
```

## GET `/multiplayer/active-game`

Returns:

```ts
{
  game: MultiplayerGameState | null
}
```

IMPORTANT:

- These are only for initial load / refresh assistance
- Real-time updates remain socket-driven

---

# Recommended Backend Folder Structure

```txt
src/
  socket/
    index.ts
    auth.ts
    handlers/
      presence.handlers.ts
      invite.handlers.ts
      game.handlers.ts

  modules/
    multiplayer/
      models/
        Invite.ts
        MultiplayerGame.ts
      services/
        presence.service.ts
        invite.service.ts
        game.service.ts
      validators/
        invite.validators.ts
        game.validators.ts
      types/
        multiplayer.types.ts
```

---

# Recommended Frontend Folder Structure

```txt
src/
  features/
    multiplayer/
      api/
        multiplayerApi.ts
      socket/
        multiplayerSocket.ts
        multiplayerEvents.ts
      store/
        multiplayerStore.ts
      hooks/
        useMultiplayerSocket.ts
        useMultiplayerTurnState.ts
      components/
        OnlineUsersList.tsx
        InviteInbox.tsx
        MultiplayerGameBoard.tsx
        TurnBanner.tsx
      types/
        multiplayer.types.ts
      utils/
        multiplayerMappers.ts
        multiplayerValidators.ts
```

---

# Error Handling Rules

## Backend

For invalid socket events:

- reject gracefully
- optionally emit a generic error event OR use Socket.IO acknowledgements
- do not crash connection
- log enough context for debugging

## Frontend

On socket-related errors:

- set `lastError`
- show a toast or inline message
- keep the UI recoverable

Recommended:

- Prefer Socket.IO acknowledgements for action-based events (`invite:send`, `invite:accept`, `game:submit-turn`)

---

# V1 Non-Goals / Anti-Overengineering Rules

Do NOT implement the following in V1 unless explicitly planned later:

- syncing every dice roll
- syncing selected dice live
- reconnect resume
- spectator support
- in-game chat
- advanced anti-cheat
- shared package extraction before multiplayer is playable

The goal of V1 is a playable multiplayer version as quickly and safely as possible.

---

# V2 Upgrade Path (Future)

Recommended future improvements after V1 is stable:

1. Extract score calculation into a shared pure TypeScript module
2. Make backend fully authoritative for score calculation
3. Add reconnect/resume support
4. Add matchmaking
5. Add richer presence / busy status
6. Add live opponent roll playback if desired

IMPORTANT:
Do NOT block V1 on V2 work.

---

# Final Implementation Rules

1. Backend is authoritative for:
   - auth
   - presence
   - invites
   - game creation
   - turn order
   - game completion
   - disconnect endings

2. Frontend is authoritative in V1 only for:
   - temporary local turn UI
   - local score calculation before submission

3. Frontend must always treat:
   - `game:started`
   - `game:state-updated`
   - `game:ended`
     as the source of truth for shared multiplayer state.

4. If the current app already has:
   - existing category keys
   - existing scoring constants
   - existing saved results model
     these should be reused instead of inventing new ones, as long as both repos stay consistent.

---
