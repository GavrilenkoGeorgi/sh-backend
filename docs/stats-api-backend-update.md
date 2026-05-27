# Stats API — Backend Update Description

This document describes required bug fixes and recommended response structure
improvements for the `GET /game/stats` endpoint. Hand this to the Node.js builder
agent in the backend repository.

---

## Bug: `lastN` query param is ignored

### Observed behaviour

The chart never shows more than 50 game scores regardless of what the frontend
sends in the `lastN` query param (e.g. `?mode=lastN&lastN=100`).

### Root cause

The backend query most likely has a hardcoded `.limit(50)` (or a default of `50`
that is never overridden) when fetching the last N game results from MongoDB.

### Fix

Read `lastN` from the incoming query string and use it as the Mongoose `.limit()`
value. Apply a reasonable server-side cap (e.g. 500) to prevent abuse.

```ts
// example — adjust to match your actual route handler
const lastN = Math.min(
  Math.max(parseInt(req.query.lastN as string) || 50, 1),
  500
)

const results = await GameResult.find({ userId })
  .sort({ createdAt: -1 })
  .limit(lastN)
```

The same fix should apply to `dateRange` mode — the query already likely filters
by date but double-check that no secondary `.limit()` is applied there.

---

## Recommended response structure improvements

The current response mixes aggregate summary fields, chart arrays, and sentinel
values in a flat object. The changes below follow common REST API conventions and
make the contract easier to maintain.

### 1. Separate summary from chart data

Group the aggregate metrics under a `summary` key so that scalar stats and chart
arrays are not interleaved.

**Current:**

```json
{
  "games": 2,
  "max": 594,
  "average": 445,
  "schoolAverage": -1,
  "percentFromMax": 50,
  "scores": [...],
  "schoolScores": [...],
  "favDiceValues": [...],
  "favComb": [...]
}
```

**Proposed:**

```json
{
  "summary": {
    "games": 2,
    "max": 594,
    "average": 445,
    "schoolAverage": null,
    "percentFromMax": 50
  },
  "scores": [...],
  "schoolScores": [...],
  "favDiceValues": [...],
  "favComb": [...]
}
```

Frontend change needed: update the `Stats` type in `src/types/index.ts` and
adjust the property accesses in `src/pages/Stats.tsx` from `data.games`,
`data.max`, etc. to `data.summary.games`, `data.summary.max`, etc.

### 2. Use `null` instead of `-1` as the "no data" sentinel

`schoolAverage: -1` is ambiguous — a negative school score is a valid game
outcome. Use `null` to signal absence of data.

**Fix in backend:** replace `-1` with `null` when there are no school results.

Frontend change needed: the `schoolAverage` field in the `Stats` interface
should become `number | null` and the `referenceValue` prop in `AreaChart`
should handle `null` gracefully (skip rendering the reference line).

### 3. Rename `id` to `timestamp` in score series

In `scores` and `schoolScores`, the `id` field stores an ISO timestamp. Using
`id` as the key is misleading. Rename it to `timestamp`.

**Current:**

```json
{ "id": "2026-05-20T20:59:58.000Z", "value": 296 }
```

**Proposed:**

```json
{ "timestamp": "2026-05-20T20:59:58.000Z", "value": 296 }
```

Frontend change needed: update `ChartAxisData` in `src/types/index.ts` — either
add a `timestamp` variant or make it a discriminated union. Update
`formatDateChartAxisData` in `src/utils/index.ts` to read `timestamp` instead
of `id`.

> Note: `favDiceValues` and `favComb` use `id` as a stable category key
> (e.g. `"ones"`, `"pair"`), which is correct — no change needed there.

### 4. Echo back the applied filter in the response

Including the filters the backend actually used lets the frontend verify that its
request was understood and makes debugging easier.

**Proposed addition:**

```json
{
  "filter": {
    "mode": "lastN",
    "lastN": 100,
    "minScore": null
  },
  "summary": { ... },
  "scores": [...],
  ...
}
```

Frontend change needed: add a `filter` field to the `Stats` interface (optional,
can be used for debugging or UI display).

### 5. Add an input validation guard on `lastN`

Reject invalid values early in the route handler rather than silently falling
back to 50 so bugs are caught at the API boundary.

```ts
const lastN = parseInt(req.query.lastN as string)
if (isNaN(lastN) || lastN < 1 || lastN > 500) {
  return res
    .status(400)
    .json({ message: 'lastN must be an integer between 1 and 500' })
}
```

---

## Summary of changes

| Area       | Priority     | Change                                               |
| ---------- | ------------ | ---------------------------------------------------- |
| Bug fix    | **critical** | Read `lastN` from query param in Mongoose `.limit()` |
| Response   | recommended  | Group scalars under `summary`                        |
| Response   | recommended  | Replace `schoolAverage: -1` sentinel with `null`     |
| Response   | recommended  | Rename `id` → `timestamp` in score series            |
| Response   | optional     | Echo applied filter in response                      |
| Validation | recommended  | Validate and cap `lastN` with a 400 response         |

The bug fix is the only strictly required change to unblock the chart. The
response structure changes are non-breaking if applied together with matching
frontend type updates.
