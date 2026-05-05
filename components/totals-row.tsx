"use client";

import { ArrowDownUp, IndianRupee, TrendingUp, Wallet } from "lucide-react";
import type { PortfolioSummary } from "@/lib/api";
import { colorForChange, inr, inrSigned, pct } from "@/lib/format";
import { StatCard } from "./stat-card";

interface TotalsRowProps {
    totals: PortfolioSummary["totals"];
}

export function TotalsRow({ totals }: TotalsRowProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
                title="Invested"
                value={inr(totals.invested)}
                icon={Wallet}
                subValue={`${totals.total_holdings} active · ${totals.fully_exited_lifetime} exited`}
                subValueClassName="text-muted-foreground"
            />

            <StatCard
                title="Current Value"
                value={inr(totals.current_value)}
                icon={IndianRupee}
                subValue={`${inrSigned(totals.unrealized_pnl)} (${pct(totals.unrealized_pnl_pct)})`}
                subValueClassName={colorForChange(totals.unrealized_pnl)}
            />

            <StatCard
                title="Day's Gain"
                value={inrSigned(totals.day_gain)}
                icon={ArrowDownUp}
                subValue={pct(totals.day_gain_pct)}
                subValueClassName={colorForChange(totals.day_gain)}
            />

            <StatCard
                title="Realized (Lifetime)"
                value={inrSigned(totals.realized_pnl_lifetime)}
                icon={TrendingUp}
                subValue="From fully-exited positions"
                subValueClassName="text-muted-foreground"
            />
        </div>
    );
}