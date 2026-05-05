/**
 * FastAPI client. Single place for all backend calls.
 * Types come from lib/api-types.ts (auto-generated from FastAPI's OpenAPI spec).
 */
import type { paths } from "./api-types";

// Base URL — env var on Mac dev, falls back to the EC2 tailnet IP for production.
export const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://100.112.20.41:8000";

// ── Type helpers extracted from auto-generated OpenAPI types ─────────────────

type GetResponse<P extends keyof paths> = paths[P] extends {
    get: { responses: { 200: { content: { "application/json": infer T } } } };
}
    ? T
    : never;

export type PortfolioSummary = GetResponse<"/portfolio/summary">;
export type Holding = GetResponse<"/portfolio/holdings">[number];

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

// ── Endpoint wrappers ────────────────────────────────────────────────────────

export const api = {
    /** Full portfolio summary — totals, movers, sectors, concentration, day's gain. */
    getSummary: (): Promise<PortfolioSummary> => apiFetch("/portfolio/summary"),

    /** All active holdings, annotated with live current price & P&L. */
    getHoldings: (): Promise<Holding[]> => apiFetch("/portfolio/holdings"),

    /** Health check. */
    getHealth: (): Promise<{ status: string; mongo: string }> => apiFetch("/health"),
};