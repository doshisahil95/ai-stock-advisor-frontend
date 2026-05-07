"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { HoldingHeader } from "@/components/holding-header";
import { HoldingStats } from "@/components/holding-stats";
import { NotesPanel } from "@/components/notes-panel";
import { PriceChart } from "@/components/price-chart";
import { TransactionsList } from "@/components/transactions-list";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export default function HoldingDetailPage() {
    const params = useParams<{ isin: string }>();
    const isin = params.isin;

    const holdingQuery = useQuery({
        queryKey: ["holding", isin],
        queryFn: () => api.getHolding(isin),
        enabled: !!isin,
        staleTime: 0, // Always fresh on mount — buy/sell operations make this critical
        refetchOnMount: "always",
    });

    return (
        <main className="min-h-screen bg-background">
            <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
                {holdingQuery.isLoading && <DetailSkeleton />}

                {holdingQuery.error && (
                    <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                        <AlertCircle className="h-4 w-4" />
                        <span>Couldn&apos;t load holding: {holdingQuery.error.message}</span>
                    </div>
                )}

                {holdingQuery.data && (
                    <div className="space-y-6">
                        <HoldingHeader holding={holdingQuery.data} />
                        <HoldingStats holding={holdingQuery.data} />
                        <PriceChart isin={isin} symbol={holdingQuery.data.symbol} />

                        <div className="grid gap-6 lg:grid-cols-2">
                            <TransactionsList isin={isin} />
                            <NotesPanel holding={holdingQuery.data} />
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}

function DetailSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-20 w-2/3" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-28" />
                ))}
            </div>
            <Skeleton className="h-80" />
            <div className="grid gap-6 lg:grid-cols-2">
                <Skeleton className="h-96" />
                <Skeleton className="h-96" />
            </div>
        </div>
    );
}