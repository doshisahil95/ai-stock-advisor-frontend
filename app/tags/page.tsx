"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Tag as TagIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { HoldingsTable } from "@/components/holdings-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { colorForChange, inr, inrSigned, pct } from "@/lib/format";

export default function TagsPage() {
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    // All holdings — used to derive the universe of tags for the selector.
    const holdingsQuery = useQuery({
        queryKey: ["tags", "all-holdings"],
        queryFn: api.getHoldings,
    });

    const tags = useMemo(() => {
        const set = new Set<string>();
        for (const h of holdingsQuery.data ?? []) {
            for (const t of h.tags ?? []) set.add(t);
        }
        return Array.from(set).sort();
    }, [holdingsQuery.data]);

    const byTagQuery = useQuery({
        queryKey: ["tags", "by-tag", selectedTag],
        queryFn: () => api.getHoldingsByTag(selectedTag as string),
        enabled: selectedTag != null,
    });

    return (
        <main className="min-h-screen bg-background">
            <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
                {/* Top bar */}
                <div className="mb-6">
                    <Link href="/" className="inline-flex">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-3 h-8 gap-2 text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back to portfolio
                        </Button>
                    </Link>
                </div>

                {/* Header */}
                <header className="mb-6">
                    <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                        <TagIcon className="h-5 w-5" />
                        Holdings by Tag
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Filter your holdings by the tags you&apos;ve assigned.
                    </p>
                </header>

                {/* Tag selector */}
                {holdingsQuery.isLoading && <Skeleton className="h-10" />}

                {holdingsQuery.error && (
                    <p className="text-sm text-red-600 dark:text-red-500">
                        Couldn&apos;t load holdings: {holdingsQuery.error.message}
                    </p>
                )}

                {holdingsQuery.data && tags.length === 0 && (
                    <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No tags yet. Add tags to holdings from a holding&apos;s detail page.
                        </CardContent>
                    </Card>
                )}

                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {tags.map((t) => (
                            <Button
                                key={t}
                                variant={selectedTag === t ? "default" : "outline"}
                                size="sm"
                                className="h-8"
                                onClick={() => setSelectedTag(t)}
                            >
                                {t}
                            </Button>
                        ))}
                    </div>
                )}

                {/* Selected-tag view */}
                {selectedTag && (
                    <div className="mt-6 space-y-4">
                        {byTagQuery.isLoading && <Skeleton className="h-64" />}

                        {byTagQuery.error && (
                            <p className="text-sm text-red-600 dark:text-red-500">
                                Couldn&apos;t load tag view: {byTagQuery.error.message}
                            </p>
                        )}

                        {byTagQuery.data && (
                            <>
                                {/* Tag-scoped totals */}
                                <div className="grid gap-4 sm:grid-cols-4">
                                    <TagStat
                                        label="Holdings"
                                        value={String(byTagQuery.data.totals.count)}
                                    />
                                    <TagStat
                                        label="Invested"
                                        value={inr(byTagQuery.data.totals.invested)}
                                    />
                                    <TagStat
                                        label="Current value"
                                        value={inr(byTagQuery.data.totals.current_value)}
                                    />
                                    <TagStat
                                        label="Unrealized P&L"
                                        value={inrSigned(
                                            byTagQuery.data.totals.unrealized_pnl
                                        )}
                                        sub={pct(
                                            byTagQuery.data.totals.unrealized_pnl_pct
                                        )}
                                        valueClassName={colorForChange(
                                            byTagQuery.data.totals.unrealized_pnl
                                        )}
                                    />
                                </div>

                                {byTagQuery.data.holdings.length === 0 ? (
                                    <Card>
                                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                                            No holdings carry the tag &quot;{selectedTag}&quot;.
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <HoldingsTable holdings={byTagQuery.data.holdings} />
                                )}
                            </>
                        )}
                    </div>
                )}

                {!selectedTag && tags.length > 0 && (
                    <p className="mt-6 text-sm text-muted-foreground">
                        Select a tag above to see its holdings.
                    </p>
                )}
            </div>
        </main>
    );
}

function TagStat({
    label,
    value,
    sub,
    valueClassName,
}: {
    label: string;
    value: string;
    sub?: string;
    valueClassName?: string;
}) {
    return (
        <div className="rounded-md ring-1 ring-foreground/10 bg-card p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {label}
            </p>
            <p className={`mt-1 font-mono text-base ${valueClassName ?? ""}`}>
                {value}
            </p>
            {sub && (
                <p className={`mt-0.5 font-mono text-xs ${valueClassName ?? ""}`}>
                    {sub}
                </p>
            )}
        </div>
    );
}