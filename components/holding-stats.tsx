"use client";

import { IndianRupee, Layers, TrendingDown, TrendingUp } from "lucide-react";
import type { Holding } from "@/lib/api";
import { colorForChange, inr, inrSigned, pct } from "@/lib/format";
import { StatCard } from "./stat-card";

interface HoldingStatsProps {
    holding: Holding;
}

export function HoldingStats({ holding }: HoldingStatsProps) {
    const pnl = holding.unrealized_pnl ? parseFloat(holding.unrealized_pnl) : 0;
    const TrendIcon = pnl >= 0 ? TrendingUp : TrendingDown;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
                title="Quantity Held"
                value={holding.quantity}
                icon={Layers}
                subValue={`First buy: ${holding.first_purchased_at ? new Date(holding.first_purchased_at).toLocaleDateString("en-IN") : "—"}`}
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
    );
}