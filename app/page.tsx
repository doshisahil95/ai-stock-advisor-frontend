"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ChevronDown,
  Eye,
  History,
  Layers,
  Receipt,
  Sparkles,
  Tag,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CollapsibleSection } from "@/components/collapsible-section";
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Research
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuItem asChild>
                  <Link href="/suggestions">
                    <Sparkles className="h-3.5 w-3.5" />
                    Suggestions
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/watchlist">
                    <Eye className="h-3.5 w-3.5" />
                    Watchlist
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/tags">
                    <Tag className="h-3.5 w-3.5" />
                    Tags
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Manage
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuItem asChild>
                  <Link href="/transactions">
                    <Layers className="h-3.5 w-3.5" />
                    Transactions
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/transactions/audit">
                    <History className="h-3.5 w-3.5" />
                    Audit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/tax">
                    <Receipt className="h-3.5 w-3.5" />
                    Tax
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ReconciliationBadge />
            <RefreshButton />
            <ThemeToggle />
          </div>
        </header>

        {/* Error state */}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            <AlertCircle className="h-4 w-4" />
            <span>Couldn&apos;t load portfolio data: {error.message}</span>
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && <DashboardSkeleton />}

        {/* Loaded content */}
        {summaryQuery.data && holdingsQuery.data && (
          <div className="space-y-6">
            <CollapsibleSection title="Portfolio totals">
              <TotalsRow totals={summaryQuery.data.totals} />
            </CollapsibleSection>

            <CollapsibleSection title="Allocation & movers">
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
            </CollapsibleSection>

            <CollapsibleSection title="Risk">
              <RiskSummaryCard
                data={riskQuery.data}
                isLoading={riskQuery.isLoading}
                error={riskQuery.error}
              />
            </CollapsibleSection>

            <CollapsibleSection title="Holdings">
              <HoldingsTable holdings={holdingsQuery.data} />
            </CollapsibleSection>
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