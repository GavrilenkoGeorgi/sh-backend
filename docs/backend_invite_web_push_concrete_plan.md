# Concrete Plan: Invite Web Push (offline invite delivery)

Derived from [backend_invite_web_push_implementation_plan.md](./backend_invite_web_push_implementation_plan.md) (the "overview") after inspecting the repository. Builder: execute **one step at a time**, in order.

## 0. Overview vs. reality (what changed and why)

| Overview assumption                                                                 | Reality in this repo                                                                                                              | Decision                                                                                                      |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Create `Invite` model, invite service, socket handlers                              | Already exist: `src/modules/multiplayer/models/Invite.ts`, `services/invite.service.ts`, `src/socket/handlers/invite.handlers.ts` | **Extend, don't recreate.** Only add what push needs.                                                         |
| Invites are tied to a `roomId` / lobby                                              | No rooms. Invites are direct user-to-user; a game is created on accept (`gameService.createGame`)                                 | Drop all `roomId`, capacity, lobby and `expireRoomInvites` logic.                                             |
| `senderId`/`recipientId` ObjectIds                                                  | Model uses `fromUserId` / `toUserId` as **strings**                                                                               | Keep existing field names and types.                                                                          |
| Status `canceled`                                                                   | Existing type is `cancelled`; no cancel flow exists                                                                               | Keep `cancelled`. Cancel is out of scope (see Q3).                                                            |
| Rooms `user:${userId}` + `io.in(room).fetchSockets()`                               | No user rooms. In-memory `presenceService` (`isUserOnline`, `getSocketIdsByUserId`), emits per-socket-id                          | Use `presenceService.isUserOnline()` for the hybrid check; do not add user rooms.                             |
| Events `invite:received` / `invite:updated` / `invite:respond`                      | Existing contract: `invite:received`, `invite:status`, `invite:accept`, `invite:decline`                                          | Keep existing events unchanged (frontend already depends on them).                                            |
| Socket handlers use `{ ok, data }` acks                                             | Existing acks are `{ success: true }` / `{ error }`                                                                               | Keep existing.                                                                                                |
| `sendInvite` works for offline users                                                | `sendInvite` **throws `Target user is not online`** (and spec says "target must be online")                                       | **Core change:** remove that rule so offline recipients can be invited and pushed.                            |
| `acceptInvite` requires only validity                                               | Accept requires both users online, then creates a game and joins sockets                                                          | Keep. Accepting from a push notification must **open the app** (socket does the accept), not call REST.       |
| Overview REST `PATCH /invites/:id/respond`, `GET /api/invites`, `POST /api/invites` | REST is mounted under `/multiplayer` (`MULTIPLAYER_ROUTES`); `GET /multiplayer/invites/incoming` exists                           | Add only **decline** over REST (for the SW action button). No REST create/accept.                             |
| Folders `src/validation`, `src/sockets`, `pushRoutes.ts`                            | Real: `src/schemas/*.schema.ts`, `src/socket/`, `src/routes/`, `src/controllers/`, `src/services/`                                | Use real folders and the `validate()` middleware (`{ body, query, params }` shape).                           |
| `express-async-handler`                                                             | **Not installed**; controllers are classes with `try/catch → next(error)` + `protect`                                             | Follow the existing controller pattern (no new lib).                                                          |
| Env via `process.env.X!`                                                            | `.env.example` exists; no env validation layer; `mailService` throws in constructor when SMTP is missing                          | Add VAPID vars to `.env.example`; push service **warns and disables** (does not crash) when keys are missing. |
| Tests: supertest integration                                                        | `src/index.ts` calls `listen` and exports no `app`; project rules forbid heavy integration/DB-bound runs                          | Unit tests only, with mocks (pattern: `userService.test.ts`, `gameService.test.ts`).                          |

## 1. Open questions (defaults below are used if unanswered)

1. **Invite expiry**: should pending invites expire (default **5 min**, lazy check; no cron because of Heroku dyno restarts)? Without it, a push can arrive for an invite that is hours old.
2. **Frontend deep link** for the push `url`: what route opens the lobby/invites? Default `/multiplayer?inviteId=<id>` (frontend must confirm).
3. **Cancel flow**: add sender-side cancel (`invite:cancel`) + dismiss push? Default **no** (not in the current spec or code).
4. **Hybrid rule**: push only when the recipient has zero sockets (default), or always also push (e.g. tab open but in background)? Default **offline only**.
5. **Block invites to users in an active game**: the spec requires it but `sendInvite` doesn't enforce it. Default **out of scope** (pre-existing gap); say if you want it folded into Step 2.
6. **Presence is in-memory** (`presenceService`), so "offline" is correct only on a single dyno. Acceptable for now (default **yes**)?
7. **Access token is 1–2h**; the SW decline call can get `401` after expiry. Default: the frontend falls back to opening the app. No server-side change.

## 2. Env / dependencies

- `npm install web-push` and `npm install -D @types/web-push` (only new packages).
- `.env.example`: add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:...`). Keys generated once with `npx web-push generate-vapid-keys`; set on Heroku (`staging` and `main` separately) config vars.

## IMPLEMENTATION_PLAN

### Step 1: Push subscription model, schema, service, routes

Goal:

- Let an authenticated user register/remove browser push subscriptions and read the VAPID public key.

Files:

- `package.json` / `package-lock.json` (update, via npm install)
- `.env.example` (update)
- `src/modules/multiplayer/models/PushSubscription.ts` (create)
- `src/schemas/push.schema.ts` (create)
- `src/modules/multiplayer/services/push.service.ts` (create: subscription management only in this step)
- `src/controllers/pushController.ts` (create)
- `src/routes/pushRoutes.ts` (create)
- `src/constants/routes.ts` (update: `PUSH_ROUTES`, `API_BASE_PATHS.PUSH = '/push'`, `buildPushUrl` optional)
- `src/index.ts` (update: `app.use(API_BASE_PATHS.PUSH, pushRoutes)`)

Details:

- Model `PushSubscription`: `userId: string` (required, indexed, matches existing string ids), `endpoint: string` (required, unique), `keys: { p256dh: string, auth: string }` (required), `userAgent?: string`, `timestamps`. Export typed `PushSubscriptionDocument`; default export of `model(...)` like `Invite.ts`.
- Zod (`push.schema.ts`, shaped for `validate()` as `z.object({ body: ... })`):
  - subscribe body: `{ endpoint: url string, expirationTime: number | null optional, keys: { p256dh: nonempty, auth: nonempty } }`.
  - unsubscribe body: `{ endpoint: url string }`.
- Routes (all `protect`, `subscribe`/`unsubscribe` also `validate`):
  - `GET /push/vapid-public-key` → `{ publicKey }`; `503` if VAPID is not configured.
  - `POST /push/subscribe` → upsert by `endpoint` (`findOneAndUpdate(..., { upsert: true, new: true })`), reassigning `userId` to the current user (same browser, different account). Store `userAgent` from `req.headers['user-agent']`. Respond `201 { ok: true }`.
  - `DELETE /push/unsubscribe` → delete by `{ endpoint, userId }`. Respond `204`.
- Service owns all DB access; controller is a thin class in the existing `try/catch → next(error)` style using `ReqWithUserData`.

Constraints:

- No `any`; named exports for services/constants (controllers keep the existing default-instance style).
- No `express-async-handler` (not installed).
- Do not log subscription keys.

---

### Step 2: Invite changes + push delivery

Goal:

- Allow inviting offline users, optionally expire invites, and send a Web Push to recipients without an active socket.

Files:

- `src/modules/multiplayer/models/Invite.ts` (update)
- `src/modules/multiplayer/types/multiplayer.types.ts` (update)
- `src/modules/multiplayer/services/push.service.ts` (update: add `sendInvitePush`)
- `src/modules/multiplayer/services/invite.service.ts` (update)
- `src/socket/handlers/invite.handlers.ts` (update)

Details:

- `Invite` model: add `expiresAt: Date` (required for new invites; set in `sendInvite` to `now + INVITE_TTL_MS`, constant `5 * 60 * 1000` exported from `src/constants/` or the service). Keep `InviteDocument` interface aligned. Existing documents lack the field, so treat missing `expiresAt` as non-expiring in the lazy check (no migration).
- `InviteReceivedPayload`: add optional `expiresAt: string` (ISO). Additive, so the existing frontend keeps working.
- `invite.service.sendInvite`:
  - **remove** the `isUserOnline(toUserId)` rejection.
  - keep: self-invite check, target exists, no pending invite in either direction. Treat a pending-but-expired invite as expired first (mark `expired`) so it doesn't block a new invite.
  - return payload as before (+ `expiresAt`). Sender name is already fetched here; reuse it for the push.
- `invite.service.acceptInvite` / `declineInvite`: if `expiresAt` exists and is in the past → set `expired`, throw `Invite has expired`. (Accept still requires both users online, unchanged.)
- `getIncomingPendingInvites` / `getOutgoingPendingInvites`: add `expiresAt: { $gt: now }` filter (include docs without `expiresAt`: `$or`) so stale invites don't show on the next login.
- `push.service.sendInvitePush(toUserId, payload: InviteReceivedPayload)`:
  - On module load / first use: `webpush.setVapidDetails(...)` only if all 3 env vars exist; otherwise `console.warn` once and make `sendInvitePush` a no-op.
  - Load subscriptions by `userId`; payload JSON (< 4 KB): `{ type: 'GAME_INVITE', inviteId, senderName, expiresAt, url }`. SW should use `tag: inviteId`.
  - `webpush.sendNotification(sub, JSON, { TTL: 300 })` via `Promise.allSettled`; on `statusCode` 404/410 delete that subscription; log other failures with `console.error` (no keys).
  - Never throws to the caller.
- `invite.handlers.ts` `invite:send`: after `sendInvite`, emit to the target's sockets as now; **if `presenceService.isUserOnline(toUserId)` is false**, fire-and-forget `void pushService.sendInvitePush(...)` (do not `await`, so the ack isn't delayed). Ack stays `{ success: true, inviteId }`.
- If the user is offline the sender still gets `success`; the invite stays `pending` until accept/decline/expiry.

Constraints:

- Keep existing event names, ack shape, and `invite:error` behavior.
- Business logic in services; the handler only wires.
- Push failures must never fail `invite:send`.
- Don't implement the "in active game" check here (Q5).

---

### Step 3: REST decline for the notification action button

Goal:

- Let the Service Worker decline an invite directly via HTTP, and keep both users' UIs in sync.

Files:

- `src/schemas/invite.schema.ts` (create)
- `src/constants/routes.ts` (update: `MULTIPLAYER_ROUTES.DECLINE_INVITE = '/invites/:inviteId/decline'`)
- `src/routes/multiplayerRoutes.ts` (update)
- `src/controllers/multiplayerController.ts` (update: `declineInvite`)

Details:

- `POST /multiplayer/invites/:inviteId/decline` (`protect` + `validate`; params: `inviteId` as a 24-hex Mongo id string).
- Controller calls the existing `inviteService.declineInvite(inviteId, req.user.id)`, then emits `invite:status` `{ inviteId, status }` to both users' sockets through `getIO()` (`src/socket/index.ts`) + `presenceService.getSocketIdsByUserId`. Duplicate emit helper already exists as a local function in the handlers; extract it to `src/socket/services/` (shared `emitToUser`) only if it stays tiny, otherwise reuse the loop inline.
- Errors: map the service's plain `Error` messages to status codes in the controller (`Invite not found` → 404, `Only the invite recipient…` → 403, `no longer pending`/`expired` → 409); everything else → `next(error)`.
- Respond `200 { inviteId, status: 'declined' }`.
- **No REST accept**: accept creates a game and joins sockets, which needs a live socket. The notification's default click opens the app at `url`, and the frontend emits `invite:accept` over the socket.

Constraints:

- Controller thin; no business logic duplicated from the service.
- CORS already allows `POST` and credentials; cookie auth means the SW must call with `credentials: 'include'`.

---

### Step 4: Unit tests (Test Writer)

Goal:

- Cover the new behavior with mocked, DB-free tests (follow the `backend-testing` skill; keep it small).

Files:

- `src/modules/multiplayer/services/push.service.test.ts` (create)
- `src/modules/multiplayer/services/invite.service.test.ts` (create, only if mocking `Invite`/`User` is cheap)

Details:

- `push.service`: `jest.mock('web-push')`; assert (a) `sendNotification` called per subscription with TTL 300, (b) a `410` rejection deletes that subscription, (c) no-op without VAPID env, (d) a rejection doesn't throw.
- `invite.service`: sending to an offline user no longer throws; expired invite is rejected on accept/decline and marked `expired`.
- Mock `Invite`, `User`, `PushSubscription`, and `presenceService`; no DB, no server.

Constraints:

- Run only the specific test files (`npx jest <file>`); no supertest/E2E.

## 3. Key decisions

- Extend the existing invite module instead of adding a parallel one; keep the event contract stable.
- "Offline" = `presenceService.isUserOnline()` false (no `fetchSockets`, no user rooms).
- Expiry is checked lazily (no cron/TTL index) to stay Heroku-friendly and avoid deleting history. An optional Mongo TTL index could be added later.
- REST is decline-only; accept stays socket-based.

## 4. Pitfalls

- Removing the offline check in `sendInvite` changes documented spec behavior (`docs/multiplayer-v1-spec.md` "target user must be online"): update that line and `invite:send` rules in the spec.
- Existing pending invites without `expiresAt` must not break (handled by the `$or`).
- Duplicate subscription endpoints across accounts: upsert reassigns the owner; on logout the frontend should call `DELETE /push/unsubscribe` (logout currently only clears cookies, no server hook needed).
- Account deletion should clean subscriptions: optionally add `PushSubscription.deleteMany({ userId })` to the existing user `findOneAndDelete` hook (small; include in Step 1 if desired).
- `presenceService` is per-process; multiple dynos would mis-detect offline users and send redundant pushes (harmless, but noted).
- Push payload contains the sender's display name; keep it minimal.

## 5. Suggested handoff

Builder: Step 1 → Step 2 → Step 3 (one at a time). Test Writer: Step 4 after Step 2 is stable.
