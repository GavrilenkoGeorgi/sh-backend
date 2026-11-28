# Backend Implementation Plan: Multiplayer Invite Notifications (Socket.IO + Web Push)

> **Overview only.** Written without repo access. The repo-aligned plan is [backend_invite_web_push_concrete_plan.md](./backend_invite_web_push_concrete_plan.md); use that for implementation.

## 1. Objective & Architecture Overview

Implement a reliable, real-time and offline-capable multiplayer invite system.

- **Online Delivery (Primary):** When a recipient has an active `socket.io` connection, deliver invites instantaneously via user-scoped Socket.IO rooms (`user:${userId}`) and synchronize state across all open tabs.
- **Offline / Background Delivery (Web Push):** When a recipient has no active sockets (or as a configurable fallback), dispatch an encrypted Web Push payload via `web-push` so the user's browser/OS displays a native notification even when the PWA is closed.
- **Persistence:** Store all invites in MongoDB (`mongoose`) so missed notifications are available via REST on next login or socket reconnect, and so Service Worker background actions can respond directly via HTTP.

---

## 2. Dependencies & Environment Configuration

### New Packages to Install

```bash
npm install web-push
npm install -D @types/web-push
```

### Environment Variables (`.env`)

Generate a VAPID key pair once (`npx web-push generate-vapid-keys`) and add the following to your backend environment configuration:

```env
VAPID_PUBLIC_KEY=<your-generated-public-key>
VAPID_PRIVATE_KEY=<your-generated-private-key>
VAPID_SUBJECT=mailto:support@yourappdomain.com
```

---

## 3. Repository Discovery Checklist (For Planning Agent)

Before creating files, inspect the existing backend codebase to align with established patterns:

1. **Socket.IO Initialization:** Locate where `new Server(...)` (`socket.io`) is configured, how `jsonwebtoken` / `cookie-parser` authenticates socket connections, and whether sockets already join a `user:${userId}` room.
2. **Multiplayer Room / Lobby Management:** Inspect how active multiplayer rooms are stored (in-memory Map, Redis, or Mongoose model) and what data is required to validate room existence, capacity, and join authorization.
3. **User Model & Auth Middleware:** Locate the existing Mongoose `User` schema and Express authentication middleware (`express` v5).
4. **Validation & Error Handling:** Check how `zod` (v4) schemas and centralized Express error handlers are structured across existing routes.

---

## 4. Step-by-Step Implementation Plan

### Step 1: Mongoose Data Models

1. **`Invite` Model (`src/models/Invite.ts`)**
   - `senderId`: `Schema.Types.ObjectId` (ref: `User`, required)
   - `recipientId`: `Schema.Types.ObjectId` (ref: `User`, required)
   - `roomId`: `String` (required, indexed)
   - `status`: `enum ["pending", "accepted", "declined", "expired", "canceled"]` (default: `"pending"`)
   - `metadata`: `{ senderName: String, senderAvatar?: String, roomName?: String, gameMode?: String }` (snapshot to avoid extra population queries when rendering push/toast payloads)
   - `readAt`: `Date` (`default: null`)
   - `expiresAt`: `Date` (required, e.g., `now + 5 minutes`)
   - `timestamps`: `true`
   - **Indexes:**
     - `{ recipientId: 1, status: 1, createdAt: -1 }` for fast inbox retrieval.
     - `{ roomId: 1, status: 1 }` for bulk expiration when a lobby starts or closes.
     - `{ senderId: 1, recipientId: 1, roomId: 1, status: 1 }` to prevent duplicate active invites.

2. **`PushSubscription` Model (`src/models/PushSubscription.ts`)**
   - `userId`: `Schema.Types.ObjectId` (ref: `User`, required, indexed)
   - `endpoint`: `String` (required, unique)
   - `keys`: `{ p256dh: { type: String, required: true }, auth: { type: String, required: true } }`
   - `userAgent`: `String` (optional, helpful for debugging multi-device subscriptions)
   - `timestamps`: `true`

### Step 2: Zod Validation Schemas (`src/validation/inviteSchemas.ts`)

Using `zod` (`^4.6.7`), define schemas for both REST bodies/params and Socket.IO event payloads:

- `createInviteSchema`: `{ recipientId: z.string().min(1), roomId: z.string().min(1) }`
- `respondInviteSchema`: `{ inviteId: z.string().min(1), action: z.enum(["accept", "decline"]) }`
- `cancelInviteSchema`: `{ inviteId: z.string().min(1) }`
- `pushSubscriptionSchema`:
  ```ts
  z.object({
    endpoint: z.string().url(),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  })
  ```

### Step 3: Web Push Service (`src/services/pushService.ts`)

- Configure `webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!)` on startup (fail fast or warn if missing).
- **`sendInvitePush(recipientId: string, invite: IInvite)`**:
  - Query all `PushSubscription` records for `recipientId`.
  - Construct a compact JSON payload (`< 4KB` limit):
    ```json
    {
      "type": "GAME_INVITE",
      "inviteId": "...",
      "roomId": "...",
      "senderName": "...",
      "gameMode": "...",
      "expiresAt": "...",
      "url": "/lobby/ROOM_ID?inviteId=INVITE_ID"
    }
    ```
  - Send via `Promise.allSettled(...)` using `webpush.sendNotification(sub, payload, { TTL: 300 })`.
  - **Stale Subscription Cleanup:** If any promise rejects with HTTP status `404` or `410` (`Gone`), automatically delete that `PushSubscription` document from MongoDB.
- **`sendInviteDismissPush(recipientId: string, inviteId: string)` (Optional):**
  - Send a silent/replacement push or rely on `tag: inviteId` if an invite is canceled or accepted on another device.

### Step 4: Invite Domain Service (`src/services/inviteService.ts`)

Encapsulate all business rules so REST controllers and Socket.IO handlers share identical logic:

1. **`createInvite(senderId, recipientId, roomId)`**:
   - Prevent self-invites (`senderId === recipientId`).
   - Verify `roomId` exists, `senderId` is a member/host, and the room is not full or already in-progress.
   - Check for an existing `"pending"` invite for `(senderId, recipientId, roomId)` where `expiresAt > now`; return existing or throw a conflict error.
   - Persist new `Invite` document.
   - **Hybrid Delivery Check:** Check Socket.IO adapter sockets in room `user:${recipientId}` (`await io.in(\`user:${recipientId}\`).fetchSockets()`).
     - Emit `invite:received` to `user:${recipientId}` if sockets exist.
     - If `sockets.length === 0` (app closed or backgrounded), call `pushService.sendInvitePush(recipientId, invite)`.
2. **`respondToInvite(inviteId, userId, action)`**:
   - Find invite by ID; verify `invite.recipientId.toString() === userId`.
   - Verify `invite.status === "pending"`. If `invite.expiresAt <= new Date()`, update status to `"expired"` and return an expiration error.
   - If `action === "accept"`:
     - Verify `roomId` still exists and has an open slot; if not, mark `"expired"` and return a room-unavailable error.
     - Update status to `"accepted"` and set `readAt = new Date()`.
   - If `action === "decline"`:
     - Update status to `"declined"` and set `readAt = new Date()`.
   - Emit `invite:updated` to both `user:${recipientId}` (closes banners on other open tabs) and `user:${senderId}` (updates lobby UI).
3. **`cancelInvite(inviteId, senderId)` & Room Lifecycle Hooks**:
   - Allow sender to cancel a `"pending"` invite (`status = "canceled"`), emitting `invite:updated` to `user:${recipientId}`.
   - Expose `expireRoomInvites(roomId)` to be called when a match starts, fills up, or the room closes.

### Step 5: Socket.IO Event Handlers (`src/sockets/inviteHandlers.ts`)

- Ensure authenticated sockets join `user:${socket.data.userId}` on connection.
- Register listeners with `zod` validation and acknowledgment callbacks (`callback({ ok: true, data })` / `callback({ ok: false, error })`):
  - `invite:send` -> calls `inviteService.createInvite(...)`
  - `invite:respond` -> calls `inviteService.respondToInvite(...)`
  - `invite:cancel` -> calls `inviteService.cancelInvite(...)`

### Step 6: Express REST API Routes (`src/routes/inviteRoutes.ts` & `src/routes/pushRoutes.ts`)

Note: REST endpoints for responding to invites are essential so the Frontend Service Worker can decline an invite directly from an OS notification action button without opening the web app.

- `GET /api/invites` — Returns active `"pending"` (non-expired) incoming invites and recent unread updates for the authenticated user.
- `POST /api/invites` — HTTP fallback to create an invite.
- `PATCH /api/invites/:inviteId/respond` — Body `{ action: "accept" | "decline" }`; calls `inviteService.respondToInvite(...)`.
- `GET /api/push/vapid-public-key` — Returns `{ publicKey: process.env.VAPID_PUBLIC_KEY }`.
- `POST /api/push/subscribe` — Upserts a `PushSubscription` for the authenticated user (`findOneAndUpdate` on `endpoint`).
- `DELETE /api/push/unsubscribe` — Removes a `PushSubscription` by `endpoint` (call on logout or user opt-out).

---

## 5. Testing Strategy (`jest` + `supertest` + `mongodb-memory-server`)

1. **Unit & Service Tests:**
   - Mock `web-push` (`jest.mock('web-push')`) and verify `sendNotification` is called when `fetchSockets()` returns empty, and skipped when an active socket exists.
   - Verify `410 Gone` responses from `web-push` remove the stale `PushSubscription` document.
   - Verify race conditions: two users accepting the last open room slot simultaneously.
2. **Integration Tests (`supertest`):**
   - Test `POST /api/push/subscribe` and `DELETE /api/push/unsubscribe` authentication and Zod validation.
   - Test `GET /api/invites` filters out expired invites.
   - Test `PATCH /api/invites/:inviteId/respond` transitions status and rejects unauthorized recipients.
