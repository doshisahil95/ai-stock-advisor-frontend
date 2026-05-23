
# ai-stock-advisor-frontend

Personal AI Stock Advisor — frontend. Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn (Nova) + TanStack Query + Recharts + sonner. Single-user UI for the backend at [`ai-stock-advisor-backend`](https://github.com/doshisahil95/ai-stock-advisor-backend). **Strictly advisory; the system never trades.**

> Last updated: 2026-05-23 (post-Chat-5 audit + cleanup).
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
- **Insights tab** — the Phase 2 surface at `/insights` (or wherever the route lives at HEAD — page-by-page route reference is deferred to a future doc chat).
- **Dossier drawer** — the slide-over rendered when the user clicks a candidate in Insights. Contains the Claude Sonnet narrative + per-signal + per-gate breakdown.
- **Feedback chips** — the `tracking` / `passed` / `rejected` / `watchlist` buttons in the dossier drawer. Each click POSTs to `/suggestions/feedback`, which writes to `monitored_stocks_audit` BEFORE updating `monitored_stocks` (F10 write-before-apply).

---

## Where to look next

- The backend lives at [`ai-stock-advisor-backend`](https://github.com/doshisahil95/ai-stock-advisor-backend). Its README is the authoritative operator manual for crons, scripts, and ops.
- `docs/data_flow.md` in the backend repo is the per-collection / per-pipeline reference.
- `docs/Project_State.md` in the backend repo is the canonical project state, audit log, and open questions registry.
- Per-page route reference (TanStack Query keys, mutation refetch patterns, endpoint mapping per route) is intentionally NOT in this README. It belongs in a future doc chat that can read the route files cleanly.
