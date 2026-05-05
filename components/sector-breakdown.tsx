"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Holding, PortfolioSummary } from "@/lib/api";
import { colorForChange, inr, pct } from "@/lib/format";

interface SectorBreakdownProps {
    sectors: PortfolioSummary["sector_breakdown"];
    holdings: Holding[];
}

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

export function SectorBreakdown({ sectors, holdings }: SectorBreakdownProps) {
    // Group holdings by sector for the tooltip listings
    const sectorMap = new Map<string, Holding[]>();
    for (const h of holdings) {
        const sector = h.sector || "Unknown";
        if (!sectorMap.has(sector)) sectorMap.set(sector, []);
        sectorMap.get(sector)!.push(h);
    }
    // Sort each sector's holdings by current value desc
    for (const list of sectorMap.values()) {
        list.sort(
            (a, b) =>
                parseFloat(b.current_value || "0") - parseFloat(a.current_value || "0")
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Sector Allocation</CardTitle>
                <CardDescription>
                    By current value · hover any sector to see holdings
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
                    {sectors.map((s, i) => {
                        const stocks = sectorMap.get(s.sector) ?? [];
                        return (
                            <Tooltip key={s.sector}>
                                <TooltipTrigger asChild>
                                    <div className="flex cursor-help items-center justify-between gap-3 rounded-sm py-1 text-sm transition-colors hover:bg-accent/40">
                                        <div className="flex min-w-0 flex-1 items-center gap-2">
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
                                </TooltipTrigger>
                                <TooltipContent
                                    side="left"
                                    align="start"
                                    className="max-w-xs p-0"
                                >
                                    <div className="space-y-1 p-2">
                                        <p className="px-1 pb-1 text-xs font-semibold">{s.sector}</p>
                                        {stocks.map((h) => (
                                            <div
                                                key={h.isin}
                                                className="flex items-center justify-between gap-3 rounded-sm px-1.5 py-1 text-xs"
                                            >
                                                <span className="font-mono">{h.symbol}</span>
                                                <span className="font-mono text-muted-foreground">
                                                    {inr(h.current_value)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}