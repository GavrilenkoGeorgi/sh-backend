# Backend changes required by the frontend invite push plan

Context: [backend_invite_web_push_concrete_plan.md](./backend_invite_web_push_concrete_plan.md) is good for the push mechanics, and the frontend plan ([frontend_invite_pwa_push_concrete_plan.md](./frontend_invite_pwa_push_concrete_plan.md)) is aligned with it. After cross-checking, the items below are missing or need confirmation. Item 1 is **required**; the rest are confirmations or small additions.

## 1. (Required) A way to invite offline users

Problem: the frontend lobby (`src/pages/Multiplayer.tsx`) lists only users from the `presence:online-users` socket event. A recipient whose app is closed has no socket, so they disappear from that list and the sender can never send them an invite. Removing the `Target user is not online` rule in `sendInvite` is not enough on its own; push would effectively never fire.

Needed: an authenticated REST endpoint returning users the current user can invite, with an `online` flag.

Proposed contract (adjust if you prefer another shape):

```ts
// GET /multiplayer/users/invitable   (protect)
interface InvitableUsersResponse {
  users: { userId: string; username: string; online: boolean }[]
}
```

- Exclude the requesting user.
- `online` computed with `presenceService.isUserOnline(userId)`.
- Decision needed from you, because it affects privacy and size: list **all registered users** (simple, exposes usernames to every logged-in user), a **search endpoint** (`?search=<prefix>`, min 2 characters, limit 20), or **friends only** (needs a friends concept that does not exist yet). Recommended for a simple pet project: search with a limit, plus the currently online users.
- Add `MULTIPLAYER_ROUTES` entry, route in `multiplayerRoutes.ts`, controller method, and a service method (read-only, `select('username')`).

## 2. Confirm push base path

The frontend will use `REACT_APP_PUSH_URL=<host>/push`, i.e. `API_BASE_PATHS.PUSH = '/push'` from backend Step 1:

- `POST /push/subscribe`, `DELETE /push/unsubscribe` (body `{ endpoint }`) with cookie auth.
- `GET /push/vapid-public-key` stays unused by the frontend (key comes from `REACT_APP_VAPID_PUBLIC_KEY`, which must be the same value as the backend `VAPID_PUBLIC_KEY` per environment).

## 3. Confirm push payload and `url` (answers backend open question Q2)

The frontend SW expects exactly:

```ts
{ type: 'GAME_INVITE', inviteId: string, senderName: string, expiresAt: string, url: string }
```

- `url` must be the **relative** path `/multiplayer?inviteId=<inviteId>` (the SW resolves it against its own origin and ignores other origins).
- The frontend composes title/body itself in English, so no `title` / `body` fields are required.
- Frontend does not need cancel (Q3 = no) and is fine with offline-only push (Q4 = default). Q7 (token expiry on SW decline) is handled by the frontend falling back to opening the app.

## 4. Decline endpoint behavior (backend Step 3)

The SW treats any non-2xx response, or a network error, as "fall back to opening the app", so no special handling is needed. Please confirm:

- Success returns `200`.
- Works with cookie auth only and no request body (the SW sends `POST` without `Content-Type`/body).
- CORS allows the frontend origins with credentials for this route (same config as the other routes; no custom headers are sent).

## 5. `invite:error` payload

The frontend will start listening to `invite:error` on the socket and show the message as an error toast (today it is not handled). Please confirm the event exists and its payload is `{ message: string }`, and that it is emitted on `invite:accept` failures, in particular when the sender went offline or the invite expired before the user tapped Accept on a notification. Messages are shown as-is (English) for now.

## 6. Spec and cleanup (already in the backend plan, listed for completeness)

- Update `docs/multiplayer-v1-spec.md` in the backend repo: invites to offline users are allowed, `invite:received` may include `expiresAt`, and the new REST endpoints.
- `PushSubscription.deleteMany({ userId })` on account deletion (backend plan, Pitfalls).
