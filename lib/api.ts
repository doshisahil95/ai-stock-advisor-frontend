/**
 * FastAPI client. Single place for all backend calls.
 *
 * Note on types: FastAPI's portfolio endpoints return dynamically-shaped dicts
 * (no Pydantic response_model), so the auto-generated OpenAPI types use `unknown`.
 * We define explicit shapes here based on what _doc_to_response() and
 * compute_summary() actually produce. If the backend shape changes, update here.
 */

// Base URL — env var on Mac dev, falls back to the EC2 tailnet IP for production.
export const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://100.112.20.41:8000";

// ── Response types (manually maintained — mirror backend) ────────────────────

/**
 * One holding row. Numeric fields come back as strings (Decimal precision)
 * and we parse with parseFloat() in the formatters.
 */
export interface Holding {
    // Identity
    isin: string;
    symbol: string;
    exchange: string;
    name?: string | null;
    sector?: string | null;
    industry?: string | null;

    // Position
    quantity: string;
    avg_cost: string;
    invested_amount: string;

    // Live P&L (added by annotate_with_current_price)
    current_price: string | null;
    current_value: string | null;
    unrealized_pnl: string | null;
    unrealized_pnl_pct: number | null;
    price_as_of: string | null;
    price_stale: boolean;

    // Day's gain (only on /portfolio/summary, not on /portfolio/holdings)
    day_gain?: string | null;
    day_gain_pct?: number | null;

    // User overlay
    thesis?: string;
    user_notes?: string;
    tags?: string[];
    stop_loss?: string | null;
    target_price?: string | null;
    alert_on?: string[];

    // Timestamps
    first_purchased_at?: string | null;
    last_traded_at?: string | null;
    realized_pnl?: string;
    created_at?: string;
    updated_at?: string;
}

export interface MoverBrief {
    isin: string;
    symbol: string;
    current_value: string | null;
    unrealized_pnl: string | null;
    unrealized_pnl_pct: number | null;
}

export interface DayMoverBrief {
    isin: string;
    symbol: string;
    current_price: string | null;
    day_gain: string | null;
    day_gain_pct: number | null;
}

export interface ConcentrationItem {
    isin: string;
    symbol: string;
    current_value: string;
    pct_of_portfolio: number;
}

export interface SectorBucket {
    sector: string;
    stock_count: number;
    invested: string;
    current_value: string;
    unrealized_pnl: string;
    unrealized_pnl_pct: number;
    pct_of_portfolio: number;
}

export interface PortfolioTotals {
    invested: string;
    current_value: string;
    unrealized_pnl: string;
    unrealized_pnl_pct: number;
    day_gain: string;
    day_gain_pct: number;
    realized_pnl_lifetime: string;
    total_dividends_lifetime: string;
    total_realized_with_dividends: string;
    total_holdings: number;
    fully_exited_lifetime: number;
    broker_invested?: string | null;
    broker_unrealized_pnl?: string | null;
    broker_unrealized_pnl_pct?: number | null;
}

export interface CostBasisAdjustment {
    _id: string;
    name: string;
    isin?: string | null;
    related_isins: string[];
    amount: string;
    it_act_section: string;
    effective_date: string;
    calculation: string;
    broker_treatment: string;
    our_treatment: string;
    rationale: string;
    source_documents: string[];
    active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface PortfolioSummary {
    as_of: string;
    totals: PortfolioTotals;
    top_gainers_by_pct: MoverBrief[];
    top_losers_by_pct: MoverBrief[];
    top_gainers_by_value: MoverBrief[];
    top_losers_by_value: MoverBrief[];
    day_gainers: DayMoverBrief[];
    day_losers: DayMoverBrief[];
    concentration: ConcentrationItem[];
    sector_breakdown: SectorBucket[];
}

// ── Generic fetcher with friendly error handling ─────────────────────────────

export class ApiError extends Error {
    constructor(public status: number, public detail: string) {
        super(`API ${status}: ${detail}`);
        this.name = "ApiError";
    }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${path}`;
    const res = await fetch(url, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...init?.headers,
        },
        cache: "no-store",
    });

    if (!res.ok) {
        let detail = res.statusText;
        try {
            const body = await res.json();
            if (body?.detail) detail = String(body.detail);
        } catch {
            // body wasn't JSON; use statusText fallback
        }
        throw new ApiError(res.status, detail);
    }

    return res.json() as Promise<T>;
}

// ── Drill-down page types ────────────────────────────────────────────────────

export interface PriceBar {
    date: string;          // ISO datetime
    open: string;
    high: string;
    low: string;
    close: string;
    volume: number;
    adj_close?: string | null;
    symbol: string;
    exchange: string;
}

export interface Transaction {
    _id: string;
    isin: string;
    symbol: string;
    exchange: string;
    type: "BUY" | "SELL" | "SPLIT" | "BONUS" | "DIVIDEND";
    trade_date: string;
    settlement_date?: string | null;
    quantity: string;
    price: string;
    trade_value?: string;
    total_fees: string;
    source?: string;
    source_ref?: string | null;
    notes?: string;
    corporate_action?: {
        ratio_from?: number;
        ratio_to?: number;
        notes?: string;
    } | null;
    remaining_quantity?: string;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
}

// ── Reconciliation types ─────────────────────────────────────────────────────

export interface ReconciliationSnapshot {
    _id?: string;
    taken_at: string;
    type: "manual" | "auto";

    // Our system numbers (always present)
    our_invested: string;
    our_current_value: string;
    our_day_gain: string | null;
    our_unrealized_pnl: string | null;

    // ICICI numbers (manual only)
    icici_invested?: string | null;
    icici_current_value?: string | null;
    icici_day_gain?: string | null;

    // Computed deltas (manual only)
    delta_invested?: string | null;
    delta_current_value?: string | null;
    delta_day_gain?: string | null;

    // Drift (manual only)
    drift_invested?: string | null;
    drift_current_value?: string | null;
    drift_day_gain?: string | null;

    has_drift?: boolean;
    alerts_sent?: string[];
    notes?: string | null;
}

export interface ManualSnapshotPayload {
    icici_invested: number;
    icici_current_value: number;
    icici_day_gain?: number;
    notes?: string;
    set_as_baseline?: boolean;
}

// ── Dividend drift (#65) ──────────────────────────────────────────────────────
// Announced (yfinance) vs received (recorded DIVIDEND txns) vs booked
// (holdings.total_dividends_received). Read-only; NOT a tax view — dividends are
// income, not capital gains. Numeric fields are strings (Decimal precision).

export type DividendDriftStatus = "matched" | "missing_receipt" | "pending";

export interface DividendAnnouncementDrift {
    ex_date: string; // ISO
    amount_per_share: string;
    expected_amount: string; // amount_per_share * quantity held
    status: DividendDriftStatus;
    matched_trade_date: string | null; // ISO of the matching DIVIDEND txn, if any
}

export interface DividendDriftRow {
    isin: string;
    symbol: string;
    quantity: string;
    booked_dividends: string; // holdings.total_dividends_received
    has_corporate_action_news: boolean;
    announcements: DividendAnnouncementDrift[];
    missing_count: number;
}

export interface UpdateHoldingPayload {
    thesis?: string | null;
    user_notes?: string | null;
    tags?: string[] | null;
    stop_loss?: string | null;
    target_price?: string | null;
    alert_on?: string[] | null;
}

// ── Buy/Sell payload types ───────────────────────────────────────────────────

export interface BuyPayload {
    symbol: string;
    exchange?: string;
    quantity: string;
    price: string;
    total_fees?: string;
    trade_date: string;
    notes?: string;
    // #54: optional explicit ISIN override. The backend AddBuyRequest accepts
    // `isin` and skips its lookup_isin() fallback when supplied. The add-a-holding
    // flow already resolved the instrument via /instruments/search, so it passes
    // the ISIN directly (deterministic; avoids the broker="ICICI" lookup path).
    isin?: string;
}

export interface SellPayload {
    quantity: string;
    price: string;
    total_fees?: string;
    trade_date: string;
    notes?: string;
}

export interface SellPreview {
    valid: boolean;
    error?: string;
    realized_pnl?: string;
    remaining_qty?: string;
    remaining_invested?: string;
    remaining_avg_cost?: string;
    fully_exits?: boolean;
    lots_consumed?: Array<{
        trade_date: string;
        qty_consumed: string;
        cost_per_share: string;
        realized_pnl: string;
    }>;
}

export type SellResponse =
    | (Holding & { _id: string })  // partial sell — the updated holding
    | { message: string; realized_total: string };  // full exit

/** Type guard — was this sell a full exit? */
export function isFullExit(r: SellResponse): r is { message: string; realized_total: string } {
    return !("_id" in r);
}

export interface EditTransactionPayload {
    quantity?: string;
    price?: string;
    trade_date?: string;
    total_fees?: string;
    notes?: string;
    reason?: string;
}

export interface TransactionSearchParams {
    symbol?: string;
    type?: "BUY" | "SELL" | "SPLIT" | "BONUS" | "DIVIDEND";
    from_date?: string;
    to_date?: string;
    limit?: number;
    skip?: number;
}

export interface TransactionSearchResponse {
    transactions: Transaction[];
    total: number;
    limit: number;
    skip: number;
}

// ── Audit log types ──────────────────────────────────────────────────────────

// ── Audit log types ──────────────────────────────────────────────────────────

export interface TransactionAuditEntry {
    _id: string;
    transaction_id: string;
    isin: string;
    action: "edit" | "delete";
    before: Record<string, unknown>;
    after: Record<string, unknown> | null;
    reason: string;
    changed_at: string;
}

/**
 * F10 — one entry per /suggestions/{isin}/feedback write.
 * Mirrors TransactionAuditEntry but for monitored_stocks feedback. Note
 * the field name is `performed_at`, not `changed_at`, to match the
 * locked schema in PROJECT_STATE §7.
 */
export type WatchlistAuditAction =
    | "watchlist_add"
    | "watchlist_update"
    | "watchlist_remove";

export interface MonitoredStocksAuditEntry {
    _id: string;
    isin: string;
    action: FeedbackAction | WatchlistAuditAction;
    previous_status: string | null;
    new_status: "tracking" | "passed" | "rejected" | "watchlist" | "removed";
    note: string;
    performed_at: string;
    _schema_version?: number;
}

// ── Suggestions types ────────────────────────────────────────────────────────

export interface SuggestionGate {
    gate_name: string;
    passed: boolean;
    threshold: string;
    actual_value: string;
    skipped: boolean;
    skip_reason: string;
}

export interface SuggestionSignal {
    signal_name: string;
    raw_value: string;
    normalized_score: number;
    weight: number;
    available: boolean;
}

export interface SuggestionCandidate {
    isin: string;
    symbol: string;
    name: string;
    sector: string;
    composite_score: number;
    rank: number;
    confidence_score: number;
    confidence_deductions: string[];
    quality_score: number;
    valuation_score: number;
    momentum_score: number;
    news_score: number;
    signals: SuggestionSignal[];
    gates: SuggestionGate[];
    gates_passed: number;
    gates_failed: number;
    gates_skipped: number;
    current_price: string | null;
    fundamentals_fetched_at: string | null;
    price_as_of: string | null;
    signal_meta?: SignalMeta[];
    group_meta?: GroupMeta;
    gate_meta?: GateMeta[];
    confidence_meta?: ConfidenceMeta;
    // F6: stateful user feedback for this candidate, scoped to the current
    // run's started_at. Null if no relevant feedback exists (or feedback
    // predates the run, in which case the card should render fresh).
    user_action?: UserAction | null;
}

/**
 * F6 — stateful feedback the user gave on this candidate AT OR AFTER this
 * run started. Stale feedback from earlier runs is intentionally excluded
 * by the backend so a card surfaced fresh in a new run is not collapsed
 * by old state.
 */
export interface UserAction {
    action: FeedbackAction;
    at: string; // ISO datetime
    note: string;
}

export interface SuggestionDossier {
    isin: string;
    symbol: string;
    one_line_thesis: string;
    bull_case: string[];
    bear_case: string[];
    key_risks: string[];
    valuation_verdict: string;
    portfolio_fit?: string;
    tax_consideration?: string;
    concentration_note?: string;
    narrative_unavailable?: boolean;
    narrative_unavailable_reason?: string;
    model?: string;
    // Commit A enrichment
    plain_english_summary?: string;
    // #55 — LLM-authored hold-horizon (buy-side only). hold_horizon is one of
    // "short" | "medium" | "long"; the three prose fields use the standard
    // "(...)" unavailable marker, so guard renders with !value.startsWith("(").
    hold_horizon?: "short" | "medium" | "long";
    hold_horizon_expected_move?: string;
    hold_horizon_rationale?: string;
    hold_horizon_review_trigger?: string;
}

export type SuggestionDirection = "buy" | "sell";

export interface SuggestionRunSummary {
    _id: string;
    run_date: string;
    run_date_ist: string;
    run_type: string;
    status: string;
    direction?: SuggestionDirection;
    universe_size: number;
    candidates_post_gates: number;
    top_k: number;
}
export interface SuggestionRun {
    _id: string;
    run_date: string;
    run_date_ist: string;
    run_type: string;
    status: string;
    direction?: SuggestionDirection;
    universe_size: number;
    excluded_held: number;
    excluded_rejected: number;
    excluded_acted?: number; // F5b — optional on legacy runs persisted pre-Chat 3
    excluded_stale_data: number;
    candidates_considered: number;
    candidates_post_gates: number;
    top_k: number;
    top_candidates: SuggestionCandidate[];
    dossiers: SuggestionDossier[];
    // Commit A enrichment (run-level)
    feedback_meta?: FeedbackMeta;
    page_intro?: PageIntro;
}

export interface SuggestionRunsList {
    runs: SuggestionRunSummary[];
    total: number;
    limit: number;
    skip: number;
}

export interface SuggestionPerformanceWindow {
    samples: number;
    avg_excess_return_pct: number | null;
    avg_stock_return_pct: number | null;
    avg_nifty_return_pct: number | null;
    win_rate_pct: number | null;
    // Commit A.5 by-bucket breakdown (optional for backward compat)
    by_bucket?: Record<BucketKey, PerformanceBucket>;
}

export interface SuggestionPerformance {
    windows: {
        "30d": SuggestionPerformanceWindow;
        "60d": SuggestionPerformanceWindow;
        "90d": SuggestionPerformanceWindow;
        "180d": SuggestionPerformanceWindow;
    };
    total_outcomes_tracked: number;
    open: number;
    acted: number;
    passed: number;
    rejected: number;  // Commit A.5
    expired: number;
}

export type FeedbackAction = "acted" | "passed" | "rejected";

export interface FeedbackPayload {
    action: FeedbackAction;
    note?: string;
}

// #55-followup — manual "run now" trigger for the suggestions pipeline.
/** POST /suggestions/run — 202 fire-and-forget. The pipeline runs in the
 *  background (~5 min); poll getSuggestionRunStatus or watch
 *  getLatestSuggestionRun for a newer run_date. notify=False (no digest, no
 *  outcome rows). 409 if a run for this direction is already in flight. */
export interface ManualRunResponse {
    status: "started";
    direction: SuggestionDirection;
    run_started_at: string;
    message: string;
}

/** GET /suggestions/run/status — is a manual (or overlapping cron) run for
 *  this direction currently executing? */
export interface ManualRunStatus {
    direction: SuggestionDirection;
    running: boolean;
    started_at: string | null;
}

export interface SignalMeta {
    signal_name: string;
    display_name: string;
    short_description: string;
    what_higher_means: string;
    raw_value_formatted: string;
    normalized_score: number;
    weight: number;
    available: boolean;
    group:
    | "quality"
    | "valuation"
    | "momentum"
    | "news"
    | "booking_opportunity"
    | "valuation_stretch"
    | "risk"
    | "tax_concentration"
    | "";
}

export type GroupBand = "strong" | "ok" | "weak" | "unknown";

export interface GroupMetaEntry {
    display_name: string;
    weight_pct: string;
    what_it_measures: string;
    score: number | null;
    band: GroupBand;
    this_candidate_interpretation: string;
}

export interface GroupMeta {
    quality?: GroupMetaEntry;
    valuation?: GroupMetaEntry;
    momentum?: GroupMetaEntry;
    news?: GroupMetaEntry;
    booking_opportunity?: GroupMetaEntry;
    valuation_stretch?: GroupMetaEntry;
    risk?: GroupMetaEntry;
    tax_concentration?: GroupMetaEntry;
}

export interface GateMeta {
    gate_name: string;
    display_name: string;
    why_we_check: string;
    passed: boolean;
    skipped: boolean;
    threshold: string;
    actual_value: string;
    skip_reason: string;
    plain_english: string;
}

export type ConfidenceBand = "high" | "med" | "low" | "unknown";

export interface ConfidenceMeta {
    score: number | null;
    band: ConfidenceBand;
    what_it_means: string;
    this_candidate_interpretation: string;
    deduction_categories: string;
    deductions: string[];
}

export interface FeedbackMetaEntry {
    display_name: string;
    what_it_does: string;
    side_effects: string;
}

export interface FeedbackMeta {
    acted: FeedbackMetaEntry;
    passed: FeedbackMetaEntry;
    rejected: FeedbackMetaEntry;
}

export interface PageIntro {
    title: string;
    summary: string;
    bullets: string[];
}

// ── Performance by-bucket (Commit A.5) ───────────────────────────────────────

export type BucketKey = "open" | "acted" | "passed" | "rejected" | "expired";

export interface PerformanceBucket {
    samples: number;
    avg_excess_return_pct: number | null;
    win_rate_pct: number | null;
}

// ── Endpoint wrappers ────────────────────────────────────────────────────────

//  Instruments search (used by the not-held research entry point)
export interface InstrumentSearchResult {
    exchange: string;
    symbol: string;
    isin: string | null;
    name?: string | null;
}

//  Chat (#27  F1/F3  ad-hoc conversations)
export type ChatScope = "suggestions" | "holding";
export type SentimentOverlay = "cautious" | "neutral" | "aggressive";

export interface ChatConversation {
    id: string;
    query: string;
    response: string;
    intent: string;
    scope: ChatScope | null;
    sentiment_overlay: SentimentOverlay | null;
    related_entities_isins: string[];
    related_holding_id: string | null;
    model_used: string;
    input_tokens: number;
    output_tokens: number;
    cost_usd: string;
    duration_ms: number;
    created_at: string;
}

export interface ChatRequestPayload {
    query: string;
    sentiment_overlay?: SentimentOverlay;
}

// ── Portfolio risk & tags response types (F12 + F15, #28) ──────────────────

/** GET /portfolio/risk-summary — one concentration row per holding (F12). */
export interface RiskConcentrationHolding {
    isin: string;
    symbol: string;
    sector: string;
    current_value: string;
    pct_of_portfolio: number;
}

/** GET /portfolio/risk-summary — one concentration row per sector (F12). */
export interface RiskConcentrationSector {
    sector: string;
    stock_count: number;
    current_value: string;
    pct_of_portfolio: number;
}

export type RiskAlertSeverity = "warn" | "high" | "info";

export interface RiskAlert {
    type:
    | "single_holding_concentration"
    | "sector_concentration"
    | "stale_price";
    severity: RiskAlertSeverity;
    message: string;
    // single_holding_concentration / sector_concentration
    pct_of_portfolio?: number;
    threshold?: number;
    isin?: string;
    symbol?: string;
    sector?: string;
    // stale_price
    count?: number;
    isins?: string[];
    symbols?: string[];
}

export interface RiskSummary {
    as_of: string;
    total_current_value: string;
    concentration_by_holding: RiskConcentrationHolding[];
    concentration_by_sector: RiskConcentrationSector[];
    alerts: RiskAlert[];
}

/** GET /portfolio/by-tag — tag-scoped totals (F15). */
export interface TagTotals {
    count: number;
    invested: string;
    current_value: string;
    unrealized_pnl: string;
    unrealized_pnl_pct: number;
}

export interface HoldingsByTag {
    tag: string;
    holdings: Holding[];
    totals: TagTotals;
}

//  Watchlist (F13, #29)

/** GET /watchlist  one monitored_stocks row with status=="watchlist",
 * enriched with the latest price. Numeric fields come back as strings
 * (Decimal precision); parse with parseFloat() in the formatters. */
export interface WatchlistEntry {
    _id: string;
    isin: string;
    symbol: string;
    name?: string | null;
    exchange?: string | null;
    sector?: string | null;
    industry?: string | null;
    status: "watchlist";
    added_by?: string;
    added_reason?: string;
    added_at?: string;
    created_at?: string;
    updated_at?: string;
    last_user_interest_at?: string | null;
    // F13 user overlay
    target_buy_price?: string | null;
    alert_above?: string | null;
    alert_below?: string | null;
    alert_on?: string[] | null;
    tags?: string[] | null;
    user_notes?: string | null;
    thesis?: string | null;
    conviction?: number | null;
    // Price enrichment (added by the router via bulk_get_latest_prices)
    current_price: string | null;
    price_as_of: string | null;
}

/** PUT /watchlist/{isin}  create or update (idempotent). All fields optional;
 * a bare {} just (re)asserts membership. `note` is the audit note, not
 * persisted onto the monitored_stocks doc. */
export interface WatchlistUpsertPayload {
    target_buy_price?: string;
    alert_above?: string;
    alert_below?: string;
    alert_on?: string[];
    tags?: string[];
    user_notes?: string;
    thesis?: string;
    conviction?: number;
    symbol?: string;
    name?: string;
    note?: string;
}

// ─── Tax / capital gains (F11, #39) ────────────────────────────────────────
/** GET /tax/capital-gains — one realized buy-lot→sell disposal row within an FY.
 *  Numeric fields come back as strings (Decimal precision); parse in formatters.
 *  Dates are IST calendar dates as YYYY-MM-DD. */
export interface CapitalGainsLot {
    isin: string;
    symbol: string;
    name: string;
    buy_date: string;
    sell_date: string;
    quantity: string;
    buy_cost: string;
    sell_proceeds: string;
    gain: string;
    holding_period_days: number;
    gain_type: "STCG" | "LTCG";
}

export interface CapitalGainsBucket {
    realized_gain: string;
    proceeds: string;
    cost: string;
    lot_count: number;
}

export interface CapitalGainsSummary {
    stcg: CapitalGainsBucket;
    ltcg: CapitalGainsBucket;
    total: CapitalGainsBucket;
}

export interface CapitalGainsResponse {
    fy: string;        // "2025-26"
    fy_start: string;  // "2025-04-01"
    fy_end: string;    // "2026-03-31"
    summary: CapitalGainsSummary;
    lots: CapitalGainsLot[];
}

export const api = {
    getSummary: (): Promise<PortfolioSummary> => apiFetch("/portfolio/summary"),
    getHoldings: (): Promise<Holding[]> => apiFetch("/portfolio/holdings"),
    getHealth: (): Promise<{ status: string; mongo: string }> =>
        apiFetch("/health"),
    getHoldingHistory: (isin: string, days = 90): Promise<PriceBar[]> =>
        apiFetch(`/portfolio/holdings/${isin}/history?days=${days}`),
    getHoldingTransactions: (isin: string): Promise<Transaction[]> =>
        apiFetch(`/portfolio/holdings/${isin}/transactions`),
    getHolding: (isin: string): Promise<Holding> =>
        apiFetch(`/portfolio/holdings/${isin}`),

    /** Most recent reconciliation snapshot (any type, or filter by 'manual'/'auto'). */
    getLatestReconciliation: (
        type?: "manual" | "auto"
    ): Promise<ReconciliationSnapshot | null> =>
        apiFetch(`/reconciliation/latest${type ? `?snapshot_type=${type}` : ""}`),

    /** All reconciliation snapshots, newest first. */
    getReconciliationHistory: (limit = 30): Promise<ReconciliationSnapshot[]> =>
        apiFetch(`/reconciliation/history?limit=${limit}`),

    /** Submit a manual snapshot with ICICI numbers. */
    postReconciliationSnapshot: (
        payload: ManualSnapshotPayload
    ): Promise<ReconciliationSnapshot> =>
        apiFetch("/reconciliation/snapshot", {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    /** Dividend-drift matrix: announced vs received vs booked per held name (#65). */
    getDividendDrift: (): Promise<DividendDriftRow[]> =>
        apiFetch("/reconciliation/dividend-drift"),

    /** All active cost-basis adjustments (CA-facing audit trail). */
    getCostBasisAdjustments: (): Promise<CostBasisAdjustment[]> =>
        apiFetch("/cost-basis/adjustments"),

    /** Update user-overlay fields (thesis, notes, stop_loss, target_price, tags). */
    updateHolding: (isin: string, payload: UpdateHoldingPayload): Promise<Holding> =>
        apiFetch(`/portfolio/holdings/${isin}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
        }),

    /** Record a BUY: creates or adds to a holding. */
    recordBuy: (payload: BuyPayload): Promise<Holding> =>
        apiFetch("/portfolio/holdings", {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    /** Record a SELL: returns updated holding, or holding=null if fully exited. */
    recordSell: (isin: string, payload: SellPayload): Promise<SellResponse> =>
        apiFetch(`/portfolio/holdings/${isin}/sell`, {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    /** Preview a SELL — no DB writes. Shows realized P&L, remaining qty, etc. */
    previewSell: (isin: string, payload: SellPayload): Promise<SellPreview> =>
        apiFetch(`/portfolio/holdings/${isin}/preview-sell`, {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    /** Search/list transactions with filters. */
    searchTransactions: (
        params?: TransactionSearchParams
    ): Promise<TransactionSearchResponse> => {
        const qs = new URLSearchParams();
        if (params?.symbol) qs.set("symbol", params.symbol);
        if (params?.type) qs.set("type", params.type);
        if (params?.from_date) qs.set("from_date", params.from_date);
        if (params?.to_date) qs.set("to_date", params.to_date);
        if (params?.limit) qs.set("limit", String(params.limit));
        if (params?.skip) qs.set("skip", String(params.skip));
        const query = qs.toString();
        return apiFetch(`/transactions/search${query ? `?${query}` : ""}`);
    },

    /** Edit one transaction (recomputes the holding; logs audit). */
    editTransaction: (txId: string, payload: EditTransactionPayload): Promise<Transaction> =>
        apiFetch(`/transactions/${txId}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
        }),

    /** Soft-delete one transaction (recomputes the holding; logs audit). */
    deleteTransaction: (
        txId: string,
        reason?: string
    ): Promise<{ message: string; isin: string; symbol: string }> =>
        apiFetch(`/transactions/${txId}`, {
            method: "DELETE",
            body: JSON.stringify({ reason: reason ?? "" }),
        }),

    /** Recent audit entries across all transactions (for the audit trail page). */
    getRecentAudit: (limit = 50): Promise<TransactionAuditEntry[]> =>
        apiFetch(`/transactions/audit/recent?limit=${limit}`),

    /** Audit history for a single transaction. */
    getTransactionAudit: (txId: string): Promise<TransactionAuditEntry[]> =>
        apiFetch(`/transactions/${txId}/audit`),

    // ── Suggestions ────────────────────────────────────────────────────────────

    getLatestSuggestionRun: (
        direction: SuggestionDirection = "buy"
    ): Promise<SuggestionRun> => apiFetch(`/suggestions/latest?direction=${direction}`),
    listSuggestionRuns: (
        limit = 20,
        skip = 0,
        direction: SuggestionDirection = "buy"
    ): Promise<SuggestionRunsList> =>
        apiFetch(`/suggestions/runs?limit=${limit}&skip=${skip}&direction=${direction}`),
    getSuggestionRun: (runId: string): Promise<SuggestionRun> =>
        apiFetch(`/suggestions/runs/${runId}`),
    getSuggestionPerformance: (
        direction: SuggestionDirection = "buy"
    ): Promise<SuggestionPerformance> =>
        apiFetch(`/suggestions/performance?direction=${direction}`),

    /** #55-followup — kick off a manual run (fire-and-forget, 202). */
    triggerSuggestionRun: (
        direction: SuggestionDirection = "buy"
    ): Promise<ManualRunResponse> =>
        apiFetch(`/suggestions/run?direction=${direction}`, { method: "POST" }),

    /** #55-followup — poll whether a manual run is still executing. */
    getSuggestionRunStatus: (
        direction: SuggestionDirection = "buy"
    ): Promise<ManualRunStatus> =>
        apiFetch(`/suggestions/run/status?direction=${direction}`),

    submitFeedback: (
        isin: string,
        payload: FeedbackPayload
    ): Promise<{
        isin: string;
        action: string;
        status: string;
        previous_status: string | null;
    }> =>
        apiFetch(`/suggestions/${isin}/feedback`, {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    /** F10 — recent feedback actions across all monitored stocks. */
    getRecentFeedbackAudit: (limit = 50): Promise<MonitoredStocksAuditEntry[]> =>
        apiFetch(`/suggestions/feedback/audit/recent?limit=${limit}`),

    /** F10 — feedback audit history for one ISIN, newest first. */
    getFeedbackAuditForIsin: (isin: string): Promise<MonitoredStocksAuditEntry[]> =>
        apiFetch(`/suggestions/${isin}/audit`),

    //  Instruments search (symbol prefix -> {exchange, symbol, isin, name})
    searchInstruments: (
        symbolPrefix: string,
        limit = 20
    ): Promise<InstrumentSearchResult[]> =>
        apiFetch(`/instruments/search/${encodeURIComponent(symbolPrefix)}?limit=${limit}`),

    //  Chat (#27  F1/F3)
    chatSuggestions: (payload: ChatRequestPayload): Promise<ChatConversation> =>
        apiFetch("/chat/suggestions", {
            method: "POST",
            body: JSON.stringify(payload),
        }),
    chatHolding: (
        isin: string,
        payload: ChatRequestPayload
    ): Promise<ChatConversation> =>
        apiFetch(`/chat/holdings/${isin}`, {
            method: "POST",
            body: JSON.stringify(payload),
        }),
    getChatHistory: (params?: {
        scope?: ChatScope;
        isin?: string;
        limit?: number;
    }): Promise<ChatConversation[]> => {
        const qs = new URLSearchParams();
        if (params?.scope) qs.set("scope", params.scope);
        if (params?.isin) qs.set("isin", params.isin);
        if (params?.limit) qs.set("limit", String(params.limit));
        const query = qs.toString();
        return apiFetch(`/chat/history${query ? `?${query}` : ""}`);
    },

    //  Portfolio risk & tags (F12 + F15, #28)
    getRiskSummary: (): Promise<RiskSummary> =>
        apiFetch("/portfolio/risk-summary"),
    getHoldingsByTag: (tag: string): Promise<HoldingsByTag> =>
        apiFetch(`/portfolio/by-tag?tag=${encodeURIComponent(tag)}`),

    //  Watchlist (F13, #29)
    getWatchlist: (): Promise<WatchlistEntry[]> => apiFetch("/watchlist"),
    getWatchlistEntry: (isin: string): Promise<WatchlistEntry> =>
        apiFetch(`/watchlist/${isin}`),
    upsertWatchlist: (
        isin: string,
        payload: WatchlistUpsertPayload
    ): Promise<WatchlistEntry> =>
        apiFetch(`/watchlist/${isin}`, {
            method: "PUT",
            body: JSON.stringify(payload),
        }),
    deleteWatchlist: (
        isin: string
    ): Promise<{ isin: string; deleted: boolean }> =>
        apiFetch(`/watchlist/${isin}`, { method: "DELETE" }),

    //  Tax / capital gains (F11, #39)
    getCapitalGains: (fy?: string): Promise<CapitalGainsResponse> =>
        apiFetch(`/tax/capital-gains${fy ? `?fy=${encodeURIComponent(fy)}` : ""}`),
};