
# ai-stock-advisor-frontend

Personal AI Stock Advisor — frontend. Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn (Nova) + TanStack Query + Recharts + sonner. Single-user UI for the backend at [`ai-stock-advisor-backend`](https://github.com/doshisahil95/ai-stock-advisor-backend). **Strictly advisory; the system never trades.**

> Last updated: 2026-07-28 (#69 round-2 review sync — noted the pages/components shipped since the Chat-5 baseline so this README has no doc-drift; the per-page reference in §13 remains the detailed source. Earlier baseline: 2026-05-23 post-Chat-5 audit + cleanup).
>
> **Shipped since the 2026-05-23 baseline (pages/components §13's older list predates):** routes `/tax` (#39 capital-gains, FY selector + STCG/LTCG cards + per-lot table), `/watchlist` (#29 F13), `/tags` (#28 F15); dashboard gained `RiskSummaryCard` (#28), a re-shown Realized-P&L card split into Capital vs Dividends (#63/#64), `CollapsibleSection` wrappers (#62), grouped top-nav dropdowns (#58), and `AddHoldingDialog` (#54); the holding drill-down embeds `ChatPanel` (#27 F1/F3, with a self-contained `MarkdownLite` — NO markdown npm dep) and shows read-only stop-loss (#41) + target (#56) strips; suggestion cards carry an LLM-authored hold-horizon badge/section (#55, buy-side only); the transactions header mounts a "Record corporate action" dialog (#68, split/bonus/demerger + §49(2C)); the suggestions page has a manual "Run now" button with polling (#71); the reconciliation page has a read-only Dividend-drift card (#65). **#69 review note:** the reconciliation snapshot mutation is the ONE write path still using lazy `invalidateQueries` (not the app-wide synchronous `refetchQueries`-before-toast convention) — tracked as master_todo #78 (U7-b).
> Companion docs in the backend repo: [`docs/data_flow.md`](https://github.com/doshisahil95/ai-stock-advisor-backend/blob/main/docs/data_flow.md) for the per-collection / per-pipeline mental model; `docs/Project_State.md` for the full architectural spec, audit log, and open questions.

---

## 1. What this is

A Next.js 16 App Router UI that talks to the backend over Tailscale. Single user, no auth (Tailscale IS the auth perimeter). Covers two phases:

- **Phase 1** — portfolio truth: holdings dashboard with sector breakdown and top movers, per-holding drill-down with charts, full-history transactions list with manual entry and audited edit/delete, ICICI reconciliation, cost-basis adjustments view (IT-Act-correct vs broker-nominal).
- **Phase 2** — suggestions engine: weekly buy + sell candidate rankings (Insights tab), per-candidate dossier drawer (Claude Sonnet narrative + signal + gate breakdown), stateful feedback (`tracking` / `passed` / `rejected` / `watchlist`) that drives F5b two-mechanism exclusion on the backend.

The two phases share the same shadcn-based component system, the same Tailwind v4 setup, and the same TanStack Query client. Phase 2 reads-only on Phase 1 data.

---

## 2. Architecture at a glance

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) — `next@^16.0.5` |
| Runtime | React 19 + React DOM 19 |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) + tailwindcss-animate. Config-in-CSS (no `tailwind.config.ts`) |
| Component primitives | shadcn (Nova preset) on Radix UI: dialog, dropdown-menu, label, select, slot, tabs, tooltip |
| Theming | `next-themes` for system / light / dark |
| Data fetching | `@tanstack/react-query` v5 + Devtools |
| Charts | `recharts` v3 |
| Toasts | `sonner` |
| Icons | `lucide-react` |
| Forms / validation | `react-hook-form` + `zod` + `@hookform/resolvers` |
| Language | TypeScript (strict mode, `"target": "ES2017"`, `bundler` moduleResolution, `@/*` path alias) |
| Linting | `eslint-config-next` v16 |
| Package manager | npm (lockfile committed as `package-lock.json`) |
| Backend transport | Plain `fetch` to `NEXT_PUBLIC_API_BASE_URL` — no SDK, no axios |

The frontend has **no custom `next.config.*`** at HEAD — the default Next.js 16 config is in use. There is **no `middleware.ts`** — Tailscale is the perimeter, the app trusts every request. There is **no `.env.example`** committed; the env shape is documented in Section 5 below.

---

## 3. First-time setup (Mac)

Prerequisites: macOS, Node 22+ (the app builds against Next 16 which requires Node ≥ 20.18), Tailscale signed in (to reach the EC2 backend later), the backend running locally on `:8001` (see backend README Section 3-4).

```bash
# 1. Clone
git clone git@github.com:doshisahil95/ai-stock-advisor-frontend.git
cd ai-stock-advisor-frontend

# 2. Install deps
npm install

# 3. Create local env file (see Section 5 for full reference)
cat > .env.local <<'EOF'
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001
EOF

# 4. Boot the dev server
npm run dev
```

Open http://localhost:3000. The dashboard hits the local backend on `:8001`. If the backend isn't running you'll see the error banner the page renders for failed fetches.

The repo also ships scripts for `build`, `start`, and `lint`:

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

---

## 4. Running locally

### Dev server with hot reload

```bash
npm run dev
```

Watches `app/`, `components/`, `lib/`. Fast Refresh handles most edits; full reload on layout/provider changes.

### Pointing at different backends

`NEXT_PUBLIC_API_BASE_URL` is read at build time AND at runtime for client components. Flip values to switch targets:

| Scenario | Value |
|---|---|
| Mac dev → local backend | `http://localhost:8001` |
| Mac dev → prod backend over Tailscale | `http://100.112.20.41:8000` |
| EC2 frontend → EC2 backend (same box) | `http://localhost:8000` or `http://100.112.20.41:8000` |

Restart `npm run dev` after changing `.env.local` — Next does not hot-reload env vars.

### Talking to the backend from another terminal

```bash
curl -sS $NEXT_PUBLIC_API_BASE_URL/health
curl -sS $NEXT_PUBLIC_API_BASE_URL/suggestions/latest?direction=buy | jq .
```

The frontend's API call shapes mirror these curls — if a curl works and the UI doesn't, the bug is in the client wrapper, not the backend.

---

## 5. Environment variable reference

Next.js convention: `NEXT_PUBLIC_*` prefix exposes the var to the browser; anything else is server-only. This app has no server-only env vars at HEAD because there's no server-side data fetching beyond what the client TanStack Query layer does.

| Var | Required | Type | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | yes | URL string, no trailing slash | Base URL of the FastAPI backend. Flips Mac dev vs EC2 prod |

There is no `.env.example` in the repo. Create `.env.local` manually per Section 3.

When changing the env value:
- Local dev: restart `npm run dev`.
- EC2 prod: edit the env file consumed by your process supervisor (see Section 7), rebuild (`npm run build`), restart.

---

## 6. Secrets layout

There are no secrets in the frontend. `NEXT_PUBLIC_API_BASE_URL` is the only env var and it is public by definition (it's compiled into the client bundle and visible in any HTML response). Tailscale handles all access control upstream of this app.

Do NOT add server-side secrets here (Anthropic / Tavily / Resend / Mongo URIs all belong on the backend). The frontend should remain a thin client over the FastAPI surface.

---

## 7. Running in production (EC2)

The frontend runs on the same EC2 t3.micro as the backend, on port `:3000`. The current README does not pin a specific process supervisor — pick one of these patterns and stick with it:

### Option A: systemd (recommended, matches backend pattern)

```bash
# On EC2
sudo tee /etc/systemd/system/portfolio-advisor-frontend.service > /dev/null <<'EOF'
[Unit]
Description=Portfolio Advisor frontend (Next.js)
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/ai-stock-advisor-frontend
Environment="NEXT_PUBLIC_API_BASE_URL=http://localhost:8000"
ExecStart=/usr/bin/npm run start
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable portfolio-advisor-frontend
sudo systemctl start portfolio-advisor-frontend
sudo systemctl --no-pager status portfolio-advisor-frontend
```

### Option B: `npm run start` inside `tmux` / `screen`

```bash
tmux new -s frontend
cd /home/ubuntu/ai-stock-advisor-frontend
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 npm run start
# Ctrl-b d to detach
```

Document which option is in use in `docs/Project_State.md` so future-you doesn't guess.

---

## 8. Deploy checklist

```bash
# 1. Local: commit + push
git status
git push origin main

# 2. SSH to EC2
ssh ubuntu@100.112.20.41
cd /home/ubuntu/ai-stock-advisor-frontend

# 3. Pull
git pull --ff-only

# 4. Install deps (no-op if package-lock.json unchanged)
npm install

# 5. Build the production bundle
npm run build
# Expected: clean exit, no type errors. Build artifact in .next/

# 6. Restart the service (systemd path)
sudo systemctl restart portfolio-advisor-frontend
sleep 4
sudo systemctl --no-pager status portfolio-advisor-frontend | head -20

# 7. Smoke check from inside the box
curl -sS -o /dev/null -w "frontend -> %{http_code}\n" http://localhost:3000
# Expected: 200

# 8. End-to-end smoke from the laptop (after re-pointing the local browser
#    to the prod Tailscale IP, OR via the laptop's existing Tailscale link):
open "http://100.112.20.41:3000"
# Walk: dashboard loads, drill-down works, transactions list paginates,
# Insights tab renders the latest run, theme toggle works.
```

Rollback: `git reset --hard <prev-sha>`, `npm install`, `npm run build`, restart.

---

## 9. TanStack Query conventions

The single source of truth for data freshness across the UI:

- **One `QueryClient` per app** instantiated in the root `Providers` component. Devtools are mounted in dev.
- **Cache keys are arrays** starting with the resource name: `["holdings"]`, `["transactions", page]`, `["suggestions", "latest", direction]`, etc. Keep this convention so future maintenance can `invalidateQueries({ queryKey: ["holdings"] })` and catch every consumer.
- **After every mutation that changes a resource, prefer `refetchQueries` over `invalidateQueries`.** Per the operational gotcha already captured in `docs/data_flow.md`: `invalidateQueries` is lazy (marks stale, refetches on next render); `refetchQueries` is synchronous (immediate refetch). Lazy invalidation under React 19 + App Router can race against navigation and show stale data on the next page paint. Use `refetchQueries` unless you know you want the laziness.
- **No prefetching across navigation.** Each route owns its queries. If a navigation needs the destination's data warm, prefetch IN THE DESTINATION ROUTE on mount with `queryClient.prefetchQuery`, not in the origin.
- **Errors render in-component**, never in toasts alone. Toasts (`sonner`) confirm mutations and surface async background failures; in-component error states handle "the page is broken right now". Both are wanted for write paths.

---

## 10. UI conventions

- **Theme** — `next-themes` with `attribute="class"` and `defaultTheme="system"`. Dark mode is opt-in via the system pref; manual toggle in the header. Hydration is handled by mounting the theme provider above the App Router children.
- **Components** — shadcn (Nova). When adding new primitives, generate via `npx shadcn@latest add <component>` and commit the generated file under `components/ui/`. Don't hand-roll Radix integrations elsewhere.
- **Typography** — `next/font` loads Geist (sans + mono). Reference via the Tailwind utilities the layout sets up; don't inline font-family.
- **Tables** — pure shadcn `<Table>` for small lists; for large lists (transactions audit, news feed), virtualize manually with `react-window` or chunked pagination via TanStack Query `keepPreviousData`. There is no shared data-grid component at HEAD.
- **Charts** — `recharts`. Wrap responsive containers; remember Recharts SSRs poorly under React 19 — see gotcha 1 in Section 11.
- **Forms** — `react-hook-form` + `zod` resolvers. Schemas live next to the form file as `<formName>.schema.ts`. The transactions add/edit forms are the canonical example.

---

## 11. Known operational gotchas

1. **Recharts under React 19 + Next.js App Router needs the `'use client'` boundary.** Server components silently render nothing. Every component that imports from `recharts` must start with `'use client'`. If a chart "doesn't appear", check the directive.
2. **`NEXT_PUBLIC_*` env changes don't hot-reload.** Restart `npm run dev` after editing `.env.local`. Production needs a rebuild (`npm run build`) for changes to land in the bundle.
3. **TanStack Query cache survives navigations.** A bug in a route that pollutes a cache key follows the user to the next route. Use stable query keys and namespace them by resource, never by page.
4. **`refetchQueries` (sync) vs `invalidateQueries` (lazy).** See Section 9. Default to `refetchQueries` after mutations; the lazy variant is for prefetch-style warming only.
5. **Dark-mode flash on first paint** can happen if you read `theme` in a component that renders before the provider hydrates. Use `useTheme` only inside components that mount after the provider, or guard with `useEffect` + a `mounted` state.
6. **Tailwind v4 is config-in-CSS.** There is no `tailwind.config.ts`. Custom design tokens live in `app/globals.css` under `@theme`. Don't add a JS config file expecting v3 behaviour.
7. **No `middleware.ts`, no auth.** Anyone on the user's Tailnet can reach the UI. Do NOT expose `:3000` to the public internet, ever. Funnel was tested once and pulled back; not in use.
8. **Strict mode + React 19 double-invocation.** Effects fire twice in dev. Make sure mutation handlers are idempotent — the backend's audited write-before-apply pattern handles double-submits, but blind toast spawns can stack two "success" toasts. Use sonner's `id` to dedupe.
9. **`npm install` after a `git pull`** — even if `package-lock.json` didn't visibly change, run it anyway. shadcn component additions sometimes update peer deps that aren't obvious from the diff.
10. **iOS Safari + Recharts touch events** can swallow the legend click. Confirmed across Recharts 3.x. If a chart legend doesn't respond on iPhone, that's the cause; route around it with a separate visibility toggle.

---

## 12. Glossary (frontend-specific)

For Phase 1 / Phase 2 / F2 / F2b / F4 / F5b / F6 / F10 / F14 / TD8 / TD9 / Q3 / A1-A19, see [`backend README Section 12`](https://github.com/doshisahil95/ai-stock-advisor-backend/blob/main/README.md). The frontend uses these terms but does not own them.

Frontend-only terms:

- **Nova preset** — the shadcn theme the project uses. Adds the dark-mode palette, the typography scale, and the chart colour ramp.
- **Drill-down** — the per-holding page at `/holdings/[isin]`. Reached from the dashboard row click.
- **Insights tab** — colloquial name for the Phase 2 suggestions surface at `/suggestions` (see Section 13 for the per-page reference).
- **Dossier drawer** — the slide-over rendered when the user clicks a candidate in Insights. Contains the Claude Sonnet narrative + per-signal + per-gate breakdown.
- **Feedback chips** — the `tracking` / `passed` / `rejected` / `watchlist` buttons in the dossier drawer. Each click POSTs to `/suggestions/feedback`, which writes to `monitored_stocks_audit` BEFORE updating `monitored_stocks` (F10 write-before-apply).

---

## Where to look next

- The backend lives at [`ai-stock-advisor-backend`](https://github.com/doshisahil95/ai-stock-advisor-backend).  Its README is the authoritative operator manual for crons, scripts, and ops.
- `docs/data_flow.md` in the backend repo is the per-collection / per-pipeline reference.
- `docs/Project_State.md` in the backend repo is the canonical project state, audit log, and open questions registry.
- Per-page route reference: see Section 13 below.

---

## 13.  Per-page reference

One subsection per route file under `app/`.  Each lists: TanStack Query keys owned, mutations that fan out to which query keys, exact backend endpoints hit, key shadcn primitives used on the page, and dark-mode behaviour.  Generated by reading every route file at SHA `9edfc8f12a2071744c4d445d679811b1cde62058` (TD13, Chat 5.5).

### `app/page.tsx` — Dashboard (`/`)

- TanStack Query keys owned: `["dashboard", "summary"]` (calls `api.getSummary` → `GET /portfolio/summary`), `["dashboard", "holdings"]` (calls `api.getHoldings` → `GET /portfolio/holdings`).
- Mutations on this page: none.  The header `RefreshButton` calls `queryClient.refetchQueries` against the dashboard keys; the `ThemeToggle` and `ReconciliationBadge` are presentational / read-only.
- Inbound `refetchQueries` from other routes: the transactions delete mutation in `app/transactions/page.tsx` fans out to `["dashboard"]` (prefix-matches both summary + holdings keys); the reconciliation snapshot mutation in `app/reconciliation/page.tsx` does NOT touch dashboard keys (intentional — reconciliation is its own subtree).
- Endpoints hit per render: `GET /portfolio/summary`, `GET /portfolio/holdings`.
- Key shadcn primitives: `Button`, `Skeleton`.  Custom composites: `HoldingsTable`, `SectorBreakdown`, `TopMovers`, `TotalsRow`, `ReconciliationBadge`, `RefreshButton`, `ThemeToggle`, `RiskSummaryCard` (#28). Header nav links: Suggestions, Tags (#28), Watchlist (#29, Eye icon → `/watchlist`).
- Dark mode: inherits from `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>` in `app/layout.tsx`; the manual `ThemeToggle` lives in the header on this page.  Error banner uses `dark:border-red-900 dark:bg-red-950/50 dark:text-red-300` style variants.

### `app/watchlist/page.tsx` — Watchlist (`/watchlist`, F13 / #29)

- TanStack Query keys owned: `["watchlist"]` (calls `api.getWatchlist` → `GET /watchlist`, price-enriched, newest `last_user_interest_at` first); `["watchlist", "search", prefix]` (calls `api.searchInstruments` → `GET /instruments/search/{prefix}`, `enabled` only when prefix ≥ 2 chars and nothing selected).
- Mutations owned: the AddToWatchlist control's upsert (`api.upsertWatchlist(isin, {symbol, name, target_buy_price?, note})` → `PUT /watchlist/{isin}`) and the per-row RemoveButton (`api.deleteWatchlist(isin)` → `DELETE /watchlist/{isin}`). Both `await onAdded()/onRemoved()` which `refetchQueries({ queryKey: ["watchlist"] })` (synchronous, per Section 9) before the sonner success toast; errors surface via `ApiError.detail`.
- Endpoints hit per render: `GET /watchlist`; on add: `GET /instruments/search/{prefix}` then `PUT /watchlist/{isin}`; on remove: `DELETE /watchlist/{isin}`.
- Key shadcn primitives: `Card`, `Table`, `Input`, `Label`, `Button`, `Skeleton`. Reuses the `/tags` page shell (back-link + header). The target-buy cell highlights emerald when current price ≤ target.
- Dark mode: inherits root theme; target-buy at/below uses `text-emerald-600 dark:text-emerald-500`.

### `app/holdings/[isin]/page.tsx` — Single-holding drill-down

- TanStack Query keys owned: `["holding", isin]` with `staleTime: 0` + `refetchOnMount: "always"` (calls `api.getHolding(isin)` → `GET /portfolio/holdings/{isin}`).  The aggressive freshness policy is deliberate — buy/sell sheets mutate the holding and stale data here corrupts FIFO assumptions in the sub-components.
- Mutations on this page: none directly.  Child components (`buy-sheet`, `sell-sheet`, `transaction-edit-sheet`, `notes-panel`) own their own mutations and `refetchQueries` against `["holding", isin]` after success.
- Sub-component query keys (not owned by this page but instantiated under it): `PriceChart` owns the price-history query, `TransactionsList` owns the per-ISIN transactions query.
- Endpoints hit per render: `GET /portfolio/holdings/{isin}`, plus `GET /portfolio/holdings/{isin}/history?days=N` and `GET /portfolio/holdings/{isin}/transactions` from sub-components.
- Key shadcn primitives: `Button`, `Skeleton`.  Custom composites: `HoldingHeader`, `HoldingStats`, `PriceChart`, `TransactionsList`, `NotesPanel`.
- Dark mode: inherits root theme.  404 / closed-position state uses `bg-card` (theme-aware); error banner uses `dark:*` variants.

### `app/transactions/page.tsx` — Transactions list + filters

- TanStack Query keys owned: `["transactions", "search", symbol, type, fromDate, toDate, page, pageSize]` — the page recomputes the key on every filter / pagination change (calls `api.searchTransactions` → `GET /transactions/search`).  Query is `enabled: !dateError` so client-side date-validation gates the fetch.
- Mutations owned: `deleteTransaction` (calls `api.deleteTransaction` → `DELETE /transactions/{id}`).  On success it `await Promise.all`s three `refetchQueries`: `["transactions"]` (the whole subtree — every filter combo is invalidated), `["holding", response.isin]` (the per-ISIN drill-down), and `["dashboard"]` (the root dashboard's summary + holdings).  This is the canonical fan-out pattern for any write that recomputes a holding.
- Edit flow uses `TransactionEditSheet` which owns its own `editTransaction` mutation → `PATCH /transactions/{id}` and runs the same fan-out.
- Endpoints hit per render: `GET /transactions/search?symbol=&type=&from_date=&to_date=&limit=&skip=`.  On mutations: `DELETE /transactions/{id}` or `PATCH /transactions/{id}`.
- Key shadcn primitives: `AlertDialog` (delete confirmation with reason gate), `Badge`, `Button`, `Card`, `Input`, `Label`, `Skeleton`, `Select`, `Textarea`, `Table`.  Custom composite: `TransactionEditSheet`.
- Dark mode: full set of `dark:*` variants on error banner, type-color badges, hover states, and the delete-button red palette.

### `app/transactions/audit/page.tsx` — Audit log (read-only)

- TanStack Query keys owned: `["transactions", "audit", "recent"]` (calls `api.getRecentAudit(100)` → `GET /transactions/audit/recent?limit=100`).
- Mutations: none.  The audit log is append-only and read-only by API contract.
- Inbound `refetchQueries` from other routes: none.  The transactions delete/edit mutations write to the audit collection on the backend, but this page's React Query cache is not invalidated from the transactions page — re-visiting the audit page after an edit triggers a normal re-fetch via `staleTime` default.  If the audit log needs to be live during a mutation session, the transactions delete mutation could be extended to also refetch `["transactions", "audit", "recent"]`; not currently wired.
- Endpoints hit per render: `GET /transactions/audit/recent?limit=100`.
- Key shadcn primitives: `Card` (per-entry), `Badge` (edit / delete), `Button`, `Skeleton`, `Separator`.
- Dark mode: action-color badges use `dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400` / `dark:bg-red-950/30`; error banner has `dark:*` variants.

### `app/reconciliation/page.tsx` — ICICI vs system reconciliation

- TanStack Query keys owned: `["reconciliation", "latest", "manual"]` (calls `api.getLatestReconciliation("manual")` → `GET /reconciliation/latest?snapshot_type=manual`) and `["reconciliation", "history"]` (calls `api.getReconciliationHistory(30)` → `GET /reconciliation/history?limit=30`).
- Mutations owned: `postReconciliationSnapshot` (calls `api.postReconciliationSnapshot` → `POST /reconciliation/snapshot`).  On success it calls `queryClient.invalidateQueries({ queryKey: ["reconciliation"] })` — **note: this is `invalidateQueries`, not `refetchQueries`** (the only consumer-facing page using the lazy pattern; the suggestions page calls this out as the "explicit refetch" convention in its inline comment).  If the StatusCard ever appears to show pre-mutation deltas right after a snapshot lands, the candidate fix is to swap `invalidateQueries` for `refetchQueries` to match the rest of the app.
- Forms: `react-hook-form` + `zod` resolver via `@hookform/resolvers/zod`.  Schema: `icici_invested` + `icici_current_value` are positive numbers; `icici_day_gain` optional; `notes` max 500; `set_as_baseline` boolean.
- Endpoints hit per render: `GET /reconciliation/latest?snapshot_type=manual`, `GET /reconciliation/history?limit=30`.  On submit: `POST /reconciliation/snapshot`.
- Key shadcn primitives: `Card`, `Button`, `Input`, `Label`, `Textarea`, `Badge`, `Skeleton`, `Table`.
- Dark mode: drift status card uses `dark:border-red-900 dark:bg-red-950/30` for drift, `dark:border-emerald-900 dark:bg-emerald-950/30` for ok; baseline-missing state uses amber variants.

### `app/cost-basis/page.tsx` — Tax-vs-broker cost basis (printable)

- TanStack Query keys owned: `["cost-basis", "adjustments"]` (calls `api.getCostBasisAdjustments` → `GET /cost-basis/adjustments`) and `["dashboard", "summary"]` (re-uses the dashboard summary key by calling `api.getSummary` → `GET /portfolio/summary`; intentional cache-share with `/` so the totals don't double-fetch when navigating).
- Mutations: none.  Page is read-only / print-only.
- Endpoints hit per render: `GET /cost-basis/adjustments`, `GET /portfolio/summary`.
- Key shadcn primitives: `Card`, `Button`, `Skeleton`, `Separator`.
- Dark mode: per-adjustment amount uses signed `text-red-600 dark:text-red-500` / `text-emerald-600 dark:text-emerald-500`.  Print styles use Tailwind's `print:` variants (`print:hidden`, `print:px-0`, `print:block`) — the back-button + print button hide on print, the footer with timestamp appears.

### `app/suggestions/page.tsx` — Weekly suggestions (Phase 2)

- TanStack Query keys owned: three direction-scoped keys — `["suggestions", "latest", direction]` (calls `api.getLatestSuggestionRun(direction)` → `GET /suggestions/latest?direction={buy|sell}`), `["suggestions", "performance", direction]` (calls `api.getSuggestionPerformance(direction)` → `GET /suggestions/performance?direction={buy|sell}`; `enabled: activeTab === "performance"`), and `["suggestions", "history", direction]` (calls `api.listSuggestionRuns(20, 0, direction)` → `GET /suggestions/runs?limit=20&skip=0&direction={buy|sell}`; `enabled: activeTab === "history"`).  Switching the Buy/Sell tab swaps `direction` and re-queries; switching the Latest/Performance/History tab toggles the `enabled` flags.
- Mutations owned: `submitFeedback` (calls `api.submitFeedback(isin, {action, note})` → `POST /suggestions/{isin}/feedback`).  On success it `await`s `Promise.all` of `queryClient.refetchQueries({ queryKey: ["suggestions", "latest", direction] })` and `queryClient.refetchQueries({ queryKey: ["suggestions", "performance", direction] })` — synchronous refetch so the `user_action` stamp lands BEFORE the success toast (per Section 9 convention; inline comment cites PROJECT_STATE §14.4).
- 404 handling: if `/suggestions/latest` returns 404 (no runs yet), `retry` short-circuits via `error instanceof ApiError && error.status === 404` so the empty-state card renders without retry spam.
- Endpoints hit per render: `GET /suggestions/latest?direction=`.  On tab switch to Performance: `GET /suggestions/performance?direction=`.  On tab switch to History: `GET /suggestions/runs?limit=20&skip=0&direction=`.  On feedback: `POST /suggestions/{isin}/feedback`.
- Key shadcn primitives: `Button`, `Card`, `Skeleton`, `Tabs` (two stacks: direction Buy/Sell + view Latest/Performance/History).  Custom composites: `SuggestionCard` (dossier + signal/gate breakdown), `PageIntro` (collapsible "how to read this page" copy from `page_intro` enrichment field).
- Dark mode: dossier all-actioned banner uses `border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20`; performance bucket table uses `bg-muted/40` (theme-aware); history-status badge uses paired emerald / amber `dark:*` variants.