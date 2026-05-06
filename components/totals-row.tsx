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
                                    Two views shown when applicable:
                                    <br />
                                    <strong>Tax basis</strong> — IT-Act-correct cost (used for capital-gains computation).
                                    <br />
                                    <strong>Broker</strong> — what ICICI shows on its portfolio screen.
                                    <br />
                                    See the <a href="/cost-basis" className="underline">audit trail</a> for the per-adjustment breakdown.
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </span>
                }
                value={inr(totals.invested)}
                icon={Wallet}
                subValue={
                    totals.broker_invested ? (
                        <>
                            <span>Tax basis</span>
                            <br />
                            <span className="text-muted-foreground/60">
                                Broker: {inr(totals.broker_invested)}
                            </span>
                        </>
                    ) : (
                        `${totals.total_holdings} active · ${totals.fully_exited_lifetime} exited`
                    )
                }
                subValueClassName="text-muted-foreground"
            />

            <StatCard
                title={
                    <span className="inline-flex items-center gap-1.5">
                        Current Value
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-3 w-3 cursor-help text-muted-foreground/60 hover:text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <p className="text-xs leading-relaxed">
                                    Refreshes every 15 minutes during market hours (Mon–Fri 09:15–15:45 IST), and
                                    daily after market close via yfinance EOD bars. P&amp;L is shown two ways
                                    when adjustments exist: tax-basis (the truth) and broker-basis (matches ICICI).
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </span>
                }
                value={inr(totals.current_value)}
                icon={IndianRupee}
                subValue={
                    totals.broker_unrealized_pnl ? (
                        <>
                            <span className={colorForChange(totals.unrealized_pnl)}>
                                Tax: {inrSigned(totals.unrealized_pnl)} ({pct(totals.unrealized_pnl_pct)})
                            </span>
                            <br />
                            <span className={`text-xs ${colorForChange(totals.broker_unrealized_pnl)} opacity-70`}>
                                Broker: {inrSigned(totals.broker_unrealized_pnl)} ({pct(totals.broker_unrealized_pnl_pct)})
                            </span>
                        </>
                    ) : (
                        `${inrSigned(totals.unrealized_pnl)} (${pct(totals.unrealized_pnl_pct)})`
                    )
                }
                subValueClassName={colorForChange(totals.unrealized_pnl)}
            />

            <StatCard
                title={
                    <span className="inline-flex items-center gap-1.5">
                        Day&apos;s Gain
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-3 w-3 cursor-help text-muted-foreground/60 hover:text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <p className="text-xs leading-relaxed">
                                    Today&apos;s price minus yesterday&apos;s close. During market hours, today&apos;s
                                    price refreshes every 15 minutes via yfinance. ICICI shows truly live tick
                                    data, so small differences during market hours are expected.
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </span>
                }
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