"use client";

import { AlertTriangle, Info, ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { RiskAlert, RiskAlertSeverity, RiskSummary } from "@/lib/api";
import { inr, pct } from "@/lib/format";

interface RiskSummaryCardProps {
    data?: RiskSummary;
    isLoading: boolean;
    error: Error | null;
}

// How many holdings to list in the compact dashboard breakdown.
// (The API returns the full list; the /tags + holdings table show the rest.)
const TOP_CONCENTRATION_ROWS = 5;

function severityBadgeVariant(
    severity: RiskAlertSeverity
): "destructive" | "secondary" | "outline" {
    if (severity === "high") return "destructive";
    if (severity === "warn") return "secondary";
    return "outline";
}

function AlertRow({ alert }: { alert: RiskAlert }) {
    const Icon =
        alert.severity === "high"
            ? ShieldAlert
            : alert.severity === "warn"
                ? AlertTriangle
                : Info;
    return (
        <div className="flex items-start gap-2 rounded-md border bg-card px-3 py-2">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 text-sm">{alert.message}</div>
            <Badge
                variant={severityBadgeVariant(alert.severity)}
                className="shrink-0"
            >
                {alert.severity}
            </Badge>
        </div>
    );
}

export function RiskSummaryCard({
    data,
    isLoading,
    error,
}: RiskSummaryCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    Risk &amp; Concentration
                </CardTitle>
                <CardDescription>
                    Concentration by holding and sector, with threshold-based alerts.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {isLoading && <Skeleton className="h-40" />}

                {error && (
                    <p className="text-sm text-red-600 dark:text-red-500">
                        Couldn&apos;t load risk summary: {error.message}
                    </p>
                )}

                {data && (
                    <>
                        {/* Alerts */}
                        <div className="space-y-2">
                            {data.alerts.length === 0 ? (
                                <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
                                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                                    No concentration alerts. Portfolio is within thresholds.
                                </div>
                            ) : (
                                data.alerts.map((a, i) => (
                                    <AlertRow key={i} alert={a} />
                                ))
                            )}
                        </div>

                        {/* Concentration by holding */}
                        <div>
                            <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                                Top Holdings by Weight
                            </h3>
                            <div className="space-y-2">
                                {data.concentration_by_holding
                                    .slice(0, TOP_CONCENTRATION_ROWS)
                                    .map((h) => (
                                        <Link
                                            key={h.isin}
                                            href={`/holdings/${h.isin}`}
                                            className="flex items-center justify-between rounded-md border bg-card px-3 py-2 transition-colors hover:bg-accent/50 hover:border-accent-foreground/20"
                                        >
                                            <span className="font-mono text-sm font-medium">
                                                {h.symbol}
                                            </span>
                                            <div className="flex items-center gap-3 font-mono text-sm">
                                                <span className="text-muted-foreground">
                                                    {inr(h.current_value)}
                                                </span>
                                                <span className="w-16 text-right">
                                                    {pct(h.pct_of_portfolio, false)}
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                            </div>
                        </div>

                        {/* Concentration by sector */}
                        <div>
                            <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                                By Sector
                            </h3>
                            <div className="space-y-2">
                                {data.concentration_by_sector.map((s) => (
                                    <div
                                        key={s.sector}
                                        className="flex items-center justify-between rounded-md border bg-card px-3 py-2"
                                    >
                                        <span className="text-sm">
                                            {s.sector}{" "}
                                            <span className="text-xs text-muted-foreground">
                                                ({s.stock_count})
                                            </span>
                                        </span>
                                        <div className="flex items-center gap-3 font-mono text-sm">
                                            <span className="text-muted-foreground">
                                                {inr(s.current_value)}
                                            </span>
                                            <span className="w-16 text-right">
                                                {pct(s.pct_of_portfolio, false)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
