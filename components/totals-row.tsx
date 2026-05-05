"use client";

import { ArrowDownUp, IndianRupee, TrendingUp, Wallet } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
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
                title={
                    <span className="inline-flex items-center gap-1.5">
                        Invested
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-3 w-3 cursor-help text-muted-foreground/60 hover:text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <p className="text-xs leading-relaxed">
                                    Total cost basis of stocks you currently hold. May differ from your broker&apos;s
                                    display by ~₹24k due to the tax-correct cost basis split applied to the Tata Motors
                                    Oct 2025 demerger (per Section 49(2C) of the IT Act). ICICI shows the original
                                    pre-demerger cost which inflates the figure.
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </span>
                }
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
                title={
                    <span className="inline-flex items-center gap-1.5">
                        Realized P&amp;L
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-3 w-3 cursor-help text-muted-foreground/60 hover:text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <p className="text-xs leading-relaxed">
                                    Net profit/loss from stocks you&apos;ve fully sold (no longer in your holdings).
                                    Computed via FIFO across all SELL transactions. Doesn&apos;t include unrealized
                                    gains on positions you still hold.
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </span>
                }
                value={inrSigned(totals.realized_pnl_lifetime)}
                icon={TrendingUp}
                subValue={`${totals.fully_exited_lifetime} closed positions`}
                subValueClassName="text-muted-foreground"
            />
        </div>
    );
}