"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { HoldingHeader } from "@/components/holding-header";
import { HoldingStats } from "@/components/holding-stats";
import { NotesPanel } from "@/components/notes-panel";
import { PriceChart } from "@/components/price-chart";
import { TransactionsList } from "@/components/transactions-list";
import { ChatPanel } from "@/components/chat-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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

                {holdingQuery.error && (() => {
                    const err = holdingQuery.error;
                    const msg = err.message;
                    // #78 U7-g: detect a closed position via the typed
                    // ApiError.status (404), not a brittle string match on the
                    // message. Keep the "No active holding" text check as a
                    // secondary signal for the 200-with-null shape.
                    const isClosed =
                        (err instanceof ApiError && err.status === 404) ||
                        msg.includes("No active holding");
                    if (isClosed) {
                        return (
                            <div className="rounded-md border bg-card p-6 text-center">
                                <p className="text-sm font-medium">This position has been closed</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    The holding has been fully sold and is no longer in your active portfolio.
                                </p>
                                <Button asChild variant="outline" size="sm" className="mt-4">
                                    <Link href="/">← Back to dashboard</Link>
                                </Button>
                            </div>
                        );
                    }
                    return (
                        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                            <AlertCircle className="h-4 w-4" />
                            <span>Couldn&apos;t load holding: {msg}</span>
                        </div>
                    );
                })()}

                {holdingQuery.data && (
                    <div className="space-y-6">
                        <HoldingHeader holding={holdingQuery.data} />
                        <HoldingStats holding={holdingQuery.data} />
                        <PriceChart isin={isin} symbol={holdingQuery.data.symbol} />

                        <div className="grid gap-6 lg:grid-cols-2">
                            <TransactionsList isin={isin} />
                            <NotesPanel holding={holdingQuery.data} />
                        </div>

                        <ChatPanel
                            title={`Ask about ${holdingQuery.data.symbol}`}
                            description="Chat about this holding — position, tax window, valuation, and news. Advisory only."
                            placeholder={`e.g. Given my cost basis and the tax window, what should I weigh on ${holdingQuery.data.symbol}?`}
                            historyParams={{ scope: "holding", isin }}
                            send={(query, sentiment) =>
                                api.chatHolding(isin, { query, sentiment_overlay: sentiment })
                            }
                        />
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