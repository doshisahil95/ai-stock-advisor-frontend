"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Eye, History, Layers, Receipt, Sparkles, Tag } from "lucide-react";
import Link from "next/link";
import { HoldingsTable } from "@/components/holdings-table";
import { ReconciliationBadge } from "@/components/reconciliation-badge";
import { RefreshButton } from "@/components/refresh-button";
import { RiskSummaryCard } from "@/components/risk-summary-card";
import { SectorBreakdown } from "@/components/sector-breakdown";
import { Skeleton } from "@/components/ui/skeleton";
import { TopMovers } from "@/components/top-movers";
import { TotalsRow } from "@/components/totals-row";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { dateTime } from "@/lib/format";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardPage() {
  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: api.getSummary,
  });

  const holdingsQuery = useQuery({
    queryKey: ["dashboard", "holdings"],
    queryFn: api.getHoldings,
  });

  const riskQuery = useQuery({
    queryKey: ["dashboard", "risk"],
    queryFn: api.getRiskSummary,
  });

  const isLoading = summaryQuery.isLoading || holdingsQuery.isLoading;
  const error = summaryQuery.error || holdingsQuery.error;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Portfolio Advisor
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {summaryQuery.data
                ? `Last updated ${dateTime(summaryQuery.data.as_of)}`
                : "Loading"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
              <Link href="/suggestions">
                <Sparkles className="h-3.5 w-3.5" />
                Suggestions
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
              <Link href="/watchlist">
                <Eye className="h-3.5 w-3.5" />
                Watchlist
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
              <Link href="/tags">
                <Tag className="h-3.5 w-3.5" />
                Tags
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
              <Link href="/transactions">
                <Layers className="h-3.5 w-3.5" />
                Transactions
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
              <Link href="/transactions/audit">
                <History className="h-3.5 w-3.5" />
                Audit
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
              <Link href="/tax">
                <Receipt className="h-3.5 w-3.5" />
                Tax
              </Link>
            </Button>
            <ReconciliationBadge />
            <RefreshButton />
            <ThemeToggle />
          </div>
        </header>

        {/* Error state */}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            <AlertCircle className="h-4 w-4" />
            <span>
              Couldn&apos;t load portfolio data: {error.message}
            </span>
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && <DashboardSkeleton />}

        {/* Loaded content */}
        {summaryQuery.data && holdingsQuery.data && (
          <div className="space-y-6">
            <TotalsRow totals={summaryQuery.data.totals} />

            <div className="grid gap-6 lg:grid-cols-2">
              <SectorBreakdown
                sectors={summaryQuery.data.sector_breakdown}
                holdings={holdingsQuery.data}
              />
              <TopMovers
                gainers={summaryQuery.data.top_gainers_by_pct}
                losers={summaryQuery.data.top_losers_by_pct}
              />
            </div>

            <RiskSummaryCard
              data={riskQuery.data}
              isLoading={riskQuery.isLoading}
              error={riskQuery.error}
            />

            <HoldingsTable holdings={holdingsQuery.data} />
          </div>
        )}
      </div>
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}