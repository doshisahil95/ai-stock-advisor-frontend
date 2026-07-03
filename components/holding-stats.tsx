"use client";

import {
    IndianRupee,
    Layers,
    ShieldAlert,
    TrendingDown,
    TrendingUp,
} from "lucide-react";
import type { Holding } from "@/lib/api";
import { colorForChange, inr, inrSigned, pct } from "@/lib/format";
import { StatCard } from "./stat-card";

interface HoldingStatsProps {
    holding: Holding;
}

export function HoldingStats({ holding }: HoldingStatsProps) {
    const pnl = holding.unrealized_pnl ? parseFloat(holding.unrealized_pnl) : 0;
    const TrendIcon = pnl >= 0 ? TrendingUp : TrendingDown;

    // #41 (TD6): read-only stop-loss indicator. Editing lives in NotesPanel
    // (the single edit surface -- no duplicate editor here); this just surfaces
    // the risk line next to live P&L and shows the cushion to the current price.
    const stopLoss = holding.stop_loss ? parseFloat(holding.stop_loss) : null;
    const currentPrice = holding.current_price
        ? parseFloat(holding.current_price)
        : null;
    const cushionPct =
        stopLoss !== null && stopLoss > 0 && currentPrice !== null
            ? (currentPrice / stopLoss - 1) * 100
            : null;
    const breached = cushionPct !== null && cushionPct <= 0;

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Quantity Held"
                    value={holding.quantity}
                    icon={Layers}
                    subValue={`First buy: ${holding.first_purchased_at
                            ? new Date(holding.first_purchased_at).toLocaleDateString(
                                "en-IN"
                            )
                            : ""
                        }`}
                    subValueClassName="text-muted-foreground"
                />
                <StatCard
                    title="Avg Cost"
                    value={inr(holding.avg_cost)}
                    icon={IndianRupee}
                    subValue={`Invested: ${inr(holding.invested_amount)}`}
                    subValueClassName="text-muted-foreground"
                />
                <StatCard
                    title="Current Price"
                    value={inr(holding.current_price)}
                    icon={IndianRupee}
                    subValue={`Value: ${inr(holding.current_value)}`}
                    subValueClassName="text-muted-foreground"
                />
                <StatCard
                    title="Unrealized P&L"
                    value={inrSigned(holding.unrealized_pnl)}
                    icon={TrendIcon}
                    subValue={pct(holding.unrealized_pnl_pct)}
                    subValueClassName={colorForChange(holding.unrealized_pnl)}
                />
            </div>

            {stopLoss !== null ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3">
                    <div className="flex items-center gap-2">
                        <ShieldAlert
                            className={`h-4 w-4 ${breached
                                    ? "text-red-600 dark:text-red-500"
                                    : "text-muted-foreground"
                                }`}
                        />
                        <span className="text-sm font-medium text-muted-foreground">
                            Stop Loss
                        </span>
                        <span className="font-mono text-sm font-semibold">
                            {inr(holding.stop_loss)}
                        </span>
                    </div>
                    <span
                        className={`font-mono text-xs ${cushionPct === null
                                ? "text-muted-foreground"
                                : breached
                                    ? "text-red-600 dark:text-red-500"
                                    : "text-emerald-600 dark:text-emerald-500"
                            }`}
                    >
                        {cushionPct === null
                            ? "no live price"
                            : breached
                                ? `${pct(cushionPct)} vs current price - stop-loss breached`
                                : `${pct(cushionPct)} above stop-loss`}
                    </span>
                </div>
            ) : (
                <div className="flex items-center gap-2 rounded-lg border border-dashed bg-card px-4 py-3">
                    <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                        No stop-loss set. Add one under{" "}
                        <span className="font-medium text-foreground">Your Notes</span> to
                        enable intraday breach alerts.
                    </span>
                </div>
            )}
        </div>
    );
}