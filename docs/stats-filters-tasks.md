# Stats Filters Tasks

Implementation plan for adding filter controls to the Stats page.

## Filter design

Filters are **mutually exclusive** in mode but can be combined with the optional
`minScore` filter:

| Param      | Type                     | Notes                        |
| ---------- | ------------------------ | ---------------------------- |
| `mode`     | `'lastN' \| 'dateRange'` | which filter mode is active  |
| `lastN`    | number                   | used when `mode = lastN`     |
| `dateFrom` | ISO date string          | used when `mode = dateRange` |
| `dateTo`   | ISO date string          | used when `mode = dateRange` |
| `minScore` | number (optional)        | applies in both modes        |

Filters are persisted in the URL as search params so the user can share/restore
them via link. Default state (no params in URL) is `mode=lastN&lastN=50`.

Predefined `lastN` options: **10, 25, 50, 100** plus a "custom" toggle that
reveals a free number input. Aggregate numbers at the top (highest score,
average, game count) update with the active filter.

## Dependencies to add

### Frontend

- `react-aria-components` — accessible filter controls (DateRangePicker,
  NumberField, RadioGroup, ToggleButtonGroup, etc.)

### Backend

- `zod` (if not already present) — query param validation

---

## Phase 1 — Backend: update stats endpoint

- [ ] Accept query params on `GET /game/stats`:
      `mode`, `lastN`, `dateFrom`, `dateTo`, `minScore`.
- [ ] Validate params (use zod or manual guards). Reject invalid combinations
      with a `400` response.
- [ ] In the stats service/controller, build a base game query that applies the
      active filter before aggregating:
  - `mode=lastN` → sort by date descending, limit to `lastN` documents.
  - `mode=dateRange` → filter `createdAt` between `dateFrom` and `dateTo`
    (inclusive, both required).
  - `minScore` → add `score >= minScore` condition to the base query.
- [ ] All aggregated values (`average`, `max`, `percentFromMax`, `games`,
      `scores`, `schoolScores`, `favDiceValues`, `favComb`) must be computed from
      the filtered result set, not the full collection.
- [ ] Default (no params) behaves identically to `mode=lastN&lastN=50`.

### Done when

- `GET /game/stats?mode=lastN&lastN=10` returns stats for the last 10 games.
- `GET /game/stats?mode=dateRange&dateFrom=2025-01-01&dateTo=2025-12-31` returns
  stats for that date range.
- `GET /game/stats?mode=lastN&lastN=50&minScore=100` returns stats for the last
  50 games with score ≥ 100.
- Invalid params return `400`.
- No params returns stats for the last 50 games.

### Copilot prompt

> Update `GET /game/stats` to accept and apply filter query params: `mode`
> (`lastN` | `dateRange`), `lastN` (number), `dateFrom` (ISO date string),
> `dateTo` (ISO date string), `minScore` (optional number). Validate params and
> return 400 on invalid input. All aggregated fields must be computed from the
> filtered result set. Default (no params) = last 50 games. Do not change the
> response shape.

---

## Phase 2 — Frontend: types, API slice, and URL param helpers

- [ ] Install `react-aria-components`.
- [ ] Add `StatsFilterParams` type to `src/types/index.ts`:
  ```ts
  export interface StatsFilterParams {
    mode: 'lastN' | 'dateRange'
    lastN?: number
    dateFrom?: string
    dateTo?: string
    minScore?: number
  }
  ```
- [ ] Update `GAME_API_ROUTES.GET_STATS` call in `gameApiSlice` — change
      `getStats` from `builder.query<Stats, void>` to
      `builder.query<Stats, StatsFilterParams>` and serialize params as query
      string.
- [ ] Add a small `buildStatsQueryString` helper in `src/utils` that converts
      `StatsFilterParams` to a URL query string (use the already-present `date-fns`
      for any date formatting if needed).
- [ ] Add a `parseStatsSearchParams` helper in `src/utils` that reads
      `URLSearchParams` and returns a valid `StatsFilterParams`, falling back to the
      default `{ mode: 'lastN', lastN: 50 }` for missing or invalid values.

### Done when

- `useGetStatsQuery({ mode: 'lastN', lastN: 10 })` sends the correct URL.
- `parseStatsSearchParams` returns the default when the URL has no params.

### Copilot prompt

> Install `react-aria-components`. Add `StatsFilterParams` to `src/types/index.ts`.
> Update `gameApiSlice.getStats` to accept `StatsFilterParams` and serialize them
> as query string params. Add `buildStatsQueryString` and `parseStatsSearchParams`
> helpers in `src/utils`. Default filter is `{ mode: 'lastN', lastN: 50 }`.

---

## Phase 3 — Frontend: StatsFilters component and Stats page wiring

- [ ] Create `src/components/stats/StatsFilters.tsx` using `react-aria-components`:
  - A `ToggleButtonGroup` (or `RadioGroup`) to switch between `lastN` and
    `dateRange` modes.
  - When `lastN` is active: row of `ToggleButton` for each preset (10, 25, 50, 100) plus a "custom" toggle that shows a `NumberField`.
  - When `dateRange` is active: a `DateRangePicker` (start + end date).
  - An optional `NumberField` for `minScore` (always visible, clears to empty
    = no filter).
  - An "apply" / live-update strategy — keep it simple: update URL params on
    every control change (no separate submit button needed, similar to how most
    filter UIs work).
  - Props: `filters: StatsFilterParams`, `onChange: (filters: StatsFilterParams) => void`.
- [ ] Create `src/components/stats/StatsFilters.module.sass` for layout styles.
- [ ] Update `src/pages/Stats.tsx`:
  - Import `useSearchParams` from `react-router`.
  - On mount, parse search params with `parseStatsSearchParams` to get the
    active `StatsFilterParams`.
  - Pass filters to `useGetStatsQuery(filters)`.
  - Render `<StatsFilters filters={filters} onChange={...} />` at the top of the
    stats section. `onChange` writes new values back to the URL via
    `setSearchParams`.
  - Keep existing `noGames` / `Fallback` guard logic unchanged.
- [ ] Add `react-aria-components` styles import or theming as needed (the library
      ships with minimal unstyled defaults, so only add what is necessary).

### Done when

- Selecting "last 10" updates the URL and re-fetches with `lastN=10`.
- Entering a custom N value updates the URL and triggers a fetch.
- Selecting a date range updates the URL and triggers a fetch.
- Entering a min score value filters the results.
- Navigating to `/stats?mode=lastN&lastN=25&minScore=120` restores those filters
  on load.
- All chart data and aggregate numbers at the top reflect the active filter.

### Copilot prompt

> Create `src/components/stats/StatsFilters.tsx` using `react-aria-components`
> with a mode toggle (lastN vs dateRange), preset lastN buttons (10/25/50/100)
> plus a custom NumberField, a DateRangePicker for date range mode, and an
> optional minScore NumberField. Props: `filters: StatsFilterParams` and
> `onChange: (f: StatsFilterParams) => void`. Then update `src/pages/Stats.tsx`
> to read/write filters via `useSearchParams` from `react-router`, pass them to
> `useGetStatsQuery`, and render `StatsFilters` at the top. Default filter is
> `{ mode: 'lastN', lastN: 50 }`.

---

## Notes

- `date-fns` is already a dependency — use it in helpers if date formatting is
  needed.
- Keep `react-aria-components` styles minimal; the existing Sass module system
  handles all visual styling.
- The `schoolAverage` TODO comment in `Stats.tsx` (currently calculated on the
  frontend) can stay as-is for now — it is not in scope for this feature.
- Backend default behaviour (no params = last 50 games) ensures the endpoint
  stays backward-compatible if any other client calls it without params.
