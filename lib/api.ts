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
    total_holdings: number;
    fully_exited_lifetime: number;
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

// ── Endpoint wrappers ────────────────────────────────────────────────────────

export const api = {
    getSummary: (): Promise<PortfolioSummary> => apiFetch("/portfolio/summary"),
    getHoldings: (): Promise<Holding[]> => apiFetch("/portfolio/holdings"),
    getHealth: (): Promise<{ status: string; mongo: string }> =>
        apiFetch("/health"),

    /** OHLCV time series for one stock; oldest → newest. */
    getHoldingHistory: (isin: string, days = 90): Promise<PriceBar[]> =>
        apiFetch(`/portfolio/holdings/${isin}/history?days=${days}`),

    /** All BUY/SELL/SPLIT/BONUS for one stock; oldest → newest. */
    getHoldingTransactions: (isin: string): Promise<Transaction[]> =>
        apiFetch(`/portfolio/holdings/${isin}/transactions`),

    /** Single holding with live P&L. */
    getHolding: (isin: string): Promise<Holding> =>
        apiFetch(`/portfolio/holdings/${isin}`),
};