
# AI Stock Advisor — Frontend

Next.js dashboard for the [AI Stock Advisor backend](https://github.com/doshisahil95/ai-stock-advisor-backend). Strictly advisory — the user trades manually, this is the analytics + recording surface.

## What it does today

A polished portfolio dashboard with full transaction management:

- **Dashboard** — totals (with tax-basis vs broker-basis dual P&L view), sector breakdown, top movers, sortable + searchable holdings table
- **Drill-down per holding** (`/holdings/[isin]`) — price chart with timeframe toggle (1M/3M/6M/1Y/5Y), sortable transactions table, editable notes panel (thesis, stop_loss, target_price, tags), buy and sell sheets with live previews
- **Buy/sell sheets** — current-price prefill, validation, FIFO realized P&L preview, confirmation dialog
- **Transactions page** (`/transactions`) — filter (symbol prefix, type, date range), pagination (10/25/50/100), edit and soft-delete with mandatory audit reason
- **Audit trail** (`/transactions/audit`) — read-only, append-only log of every transaction change with field-level diffs
- **Reconciliation** (`/reconciliation`) — manual ICICI snapshot form, history table, drift detection
- **Cost basis** (`/cost-basis`) — CA-facing audit page with IT-Act-correct cost calculations (Section 49(2C) and similar), printable
- **Live freshness** — 15-min intraday refresh during market hours, auto-fallback to EOD
- **Toast notifications** with close button (sonner)
- **Dark mode** with system preference auto-detect + manual override

## Stack

- **Next.js 16** (Turbopack) with React 19
- **TypeScript** (strict mode)
- **Tailwind v4** with the [shadcn/ui](https://ui.shadcn.com) component library (Nova preset)
- **Recharts** for the price chart
- **TanStack Query (React Query)** for server state
- **react-hook-form + zod** for form validation
- **sonner** for toasts
- **next-themes** for dark mode
- **lucide-react** for icons
- **openapi-typescript** to auto-generate API types from the FastAPI OpenAPI spec
- Hosted on AWS EC2 t3.micro (`ap-south-1`), accessed only via Tailscale

## Routes

| Route | Page |
|---|---|
| `/` | Dashboard — totals, sectors, top movers, holdings |
| `/holdings/[isin]` | Drill-down — chart, transactions, editable notes, buy/sell |
| `/transactions` | Portfolio-wide transactions with filter/edit/delete |
| `/transactions/audit` | Append-only audit log |
| `/reconciliation` | Broker reconciliation snapshots + drift detection |
| `/cost-basis` | IT-Act-correct cost-basis audit (CA-facing, printable) |

## Header buttons (consistent across the app)

- **Transactions** → portfolio-wide list
- **Audit** → audit log of edits/deletes
- **Reconciliation badge** → green/red/amber indicator + tooltip showing last broker check + last auto snapshot
- **Refresh** → re-reads dashboard data (prices auto-refresh every 15 min via cron)
- **Theme toggle** → light / dark / system

## Local development

```bash
git clone https://github.com/doshisahil95/ai-stock-advisor-frontend.git
cd ai-stock-advisor-frontend

# Install deps
npm install --legacy-peer-deps

# Generate API types from a running backend
API_OPENAPI_URL=http://localhost:8000 npm run gen-api

# Dev server
npm run dev
```

The dev server expects the backend to be reachable at `http://localhost:8000` (configured via `NEXT_PUBLIC_API_BASE_URL` in `.env.local`).

## Build / lint / type check

```bash
npm run build       # also runs type check
npm run lint        # ESLint
npm run gen-api     # regenerate lib/api-types.ts from OpenAPI spec
```

`lib/api-types.ts` is auto-generated and gitignored — regenerated per environment (locally and at deploy time).

## Deployment

EC2 t3.micro runs the Next.js production build as a systemd service. Pull-and-restart via `~/deploy-ui.sh`:

```bash
# On the EC2 host
~/deploy-ui.sh
sudo systemctl status portfolio-advisor-ui.service
```

The deploy script:
1. `git pull origin main`
2. `npm install --legacy-peer-deps` (sync deps if package-lock changed)
3. `npm run gen-api` against the local backend
4. `npm run build`
5. Restarts the systemd service

## Repository layout

```
app/
├── page.tsx                        # Dashboard
├── layout.tsx                      # Root layout (Providers, ThemeProvider, Toaster)
├── holdings/[isin]/page.tsx        # Drill-down
├── transactions/
│   ├── page.tsx                    # Transactions list with filter/edit/delete
│   └── audit/page.tsx              # Audit trail
├── reconciliation/page.tsx
└── cost-basis/page.tsx

components/
├── ui/                             # shadcn primitives (button, card, dialog, sheet, etc.)
├── totals-row.tsx                  # 4 stat cards on dashboard
├── sector-breakdown.tsx
├── top-movers.tsx
├── holdings-table.tsx              # Sortable + searchable
├── holding-header.tsx              # Drill-down header with Buy/Sell buttons
├── price-chart.tsx                 # Recharts area chart
├── transactions-table.tsx          # Drill-down transactions
├── notes-panel.tsx                 # Editable thesis/notes
├── buy-sheet.tsx
├── sell-sheet.tsx                  # With FIFO preview + confirm dialog
├── transaction-edit-sheet.tsx
├── reconciliation-badge.tsx        # Header badge with tooltip
├── refresh-button.tsx
├── theme-toggle.tsx
└── theme-provider.tsx

lib/
├── api.ts                          # Hand-written API wrappers + types
├── api-types.ts                    # Auto-generated from OpenAPI spec (gitignored)
├── format.ts                       # IST-locked date/INR formatting
└── utils.ts                        # cn() and shadcn helpers
```

## Key UX patterns

- **All dates render in IST** (Asia/Kolkata) regardless of the viewer's locale, locked via `dateTime`/`dateShort` helpers in `lib/format.ts`.
- **Mutations always `refetchQueries` synchronously** before showing the success toast, so the UI reflects the new state immediately. Pattern: `await Promise.all([refetchQueries(...)]); toast.success(...)`.
- **Holding query uses `staleTime: 0` + `refetchOnMount: "always"`** on the drill-down so navigating in always shows fresh data after a buy/sell.
- **Sheets force-refetch the parent holding when they open** (defensive — avoids stale `availableQty`).
- **Color-coded buttons** for destructive vs additive actions (red Sell, emerald Buy).
- **Validated forms with zod + react-hook-form**. Quantity inputs use `step="1"` (Indian equity = whole shares). Backend rejects edits that would produce impossible state (FIFO over-sell), surfaced as toast errors.

## What's next

The advisory dashboard is complete. Phase 2 will add:

- News timeline (`/news`) integrating Tavily + Claude classification
- Conversational agent (`/agent`) with portfolio tool access
- Alert center (`/alerts`) for stop-loss/target/news triggers
- Mobile responsive polish

## License

Personal project. No license; all rights reserved.
