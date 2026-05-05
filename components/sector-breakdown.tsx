"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import type { PortfolioSummary } from "@/lib/api";
import { colorForChange, inr, pct } from "@/lib/format";

interface SectorBreakdownProps {
    sectors: PortfolioSummary["sector_breakdown"];
}

// Tailwind palette for sector bars — feel free to swap later
const COLORS = [
    "bg-sky-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-violet-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-orange-500",
    "bg-indigo-500",
];

export function SectorBreakdown({ sectors }: SectorBreakdownProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Sector Allocation</CardTitle>
                <CardDescription>
                    By current value. Sector data from yfinance.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Stacked bar */}
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    {sectors.map((s, i) => (
                        <div
                            key={s.sector}
                            className={`${COLORS[i % COLORS.length]} transition-opacity hover:opacity-80`}
                            style={{ width: `${s.pct_of_portfolio}%` }}
                            title={`${s.sector}: ${s.pct_of_portfolio}%`}
                        />
                    ))}
                </div>

                {/* Legend rows */}
                <div className="space-y-1.5">
                    {sectors.map((s, i) => (
                        <div
                            key={s.sector}
                            className="flex items-center justify-between gap-3 rounded-sm py-1 text-sm"
                        >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div
                                    className={`h-2.5 w-2.5 shrink-0 rounded-sm ${COLORS[i % COLORS.length]}`}
                                />
                                <span className="truncate font-medium">{s.sector}</span>
                                <span className="text-xs text-muted-foreground">
                                    {s.stock_count}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 font-mono text-xs">
                                <span className="w-20 text-right">{inr(s.current_value)}</span>
                                <span className="w-12 text-right text-muted-foreground">
                                    {pct(s.pct_of_portfolio, false)}
                                </span>
                                <span
                                    className={`w-16 text-right ${colorForChange(s.unrealized_pnl)}`}
                                >
                                    {pct(s.unrealized_pnl_pct)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}