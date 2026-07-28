"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import type { PortfolioSummary } from "@/lib/api";
import { colorForChange, inrSigned, pct } from "@/lib/format";

interface TopMoversProps {
    gainers: PortfolioSummary["top_gainers_by_pct"];
    losers: PortfolioSummary["top_losers_by_pct"];
}

export function TopMovers({ gainers, losers }: TopMoversProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Top Movers (Top 5)</CardTitle>
                <CardDescription>
                    By percentage change since your purchase
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <MoverList title="Gainers" items={gainers} icon={ArrowUp} />
                <MoverList title="Losers" items={losers} icon={ArrowDown} />
            </CardContent>
        </Card>
    );
}

interface MoverListProps {
    title: string;
    items: PortfolioSummary["top_gainers_by_pct"];
    icon: typeof ArrowUp;
}

function MoverList({ title, items, icon: Icon }: MoverListProps) {
    return (
        <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {title}
            </h3>
            <div className="space-y-2">
                {items.map((m) => (
                    <Link
                        key={m.isin}
                        href={`/holdings/${m.isin}`}
                        className="flex items-center justify-between rounded-md border bg-card px-3 py-2 transition-colors hover:bg-accent/50 hover:border-accent-foreground/20"
                    >
                        <span className="font-mono text-sm font-medium">{m.symbol}</span>
                        <div className="flex items-center gap-3 font-mono text-sm">
                            <span className={colorForChange(m.unrealized_pnl)}>
                                {inrSigned(m.unrealized_pnl)}
                            </span>
                            <span className={`w-16 text-right ${colorForChange(m.unrealized_pnl_pct)}`}>
                                {pct(m.unrealized_pnl_pct)}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}