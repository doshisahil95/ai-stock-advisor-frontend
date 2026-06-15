"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    api,
    ApiError,
    type InstrumentSearchResult,
    type WatchlistEntry,
    type WatchlistUpsertPayload,
} from "@/lib/api";
import { dateTime, inr } from "@/lib/format";

export default function WatchlistPage() {
    const queryClient = useQueryClient();

    const watchlistQuery = useQuery({
        queryKey: ["watchlist"],
        queryFn: api.getWatchlist,
    });

    const refetchWatchlist = () =>
        queryClient.refetchQueries({ queryKey: ["watchlist"] });

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
                        <Eye className="h-5 w-5" />
                        Watchlist
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Names you&apos;re tracking but don&apos;t hold. Watchlisted
                        stocks join the weekly buy-suggestion universe and pull
                        fundamentals + news like held names.
                    </p>
                </header>

                {/* Add control */}
                <AddToWatchlist onAdded={refetchWatchlist} />

                {/* List */}
                <div className="mt-6">
                    {watchlistQuery.isLoading && <Skeleton className="h-64" />}
                    {watchlistQuery.error && (
                        <p className="text-sm text-red-600 dark:text-red-500">
                            Couldn&apos;t load watchlist:{" "}
                            {watchlistQuery.error.message}
                        </p>
                    )}
                    {watchlistQuery.data &&
                        watchlistQuery.data.length === 0 && (
                            <Card>
                                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                                    Your watchlist is empty. Search for a stock
                                    above to start tracking it.
                                </CardContent>
                            </Card>
                        )}
                    {watchlistQuery.data && watchlistQuery.data.length > 0 && (
                        <WatchlistTable
                            rows={watchlistQuery.data}
                            onRemoved={refetchWatchlist}
                        />
                    )}
                </div>
            </div>
        </main>
    );
}

function AddToWatchlist({ onAdded }: { onAdded: () => Promise<void> | void }) {
    const [prefix, setPrefix] = useState("");
    const [selected, setSelected] = useState<InstrumentSearchResult | null>(
        null
    );
    const [targetBuy, setTargetBuy] = useState("");

    const searchQuery = useQuery({
        queryKey: ["watchlist", "search", prefix],
        queryFn: () => api.searchInstruments(prefix),
        enabled: prefix.trim().length >= 2 && selected === null,
    });

    const mutation = useMutation({
        mutationFn: () => {
            if (!selected?.isin) throw new Error("Select a stock first");
            const payload: WatchlistUpsertPayload = {
                symbol: selected.symbol,
                name: selected.name ?? undefined,
                note: "added from watchlist page",
            };
            if (targetBuy.trim()) payload.target_buy_price = targetBuy.trim();
            return api.upsertWatchlist(selected.isin, payload);
        },
        onSuccess: async (entry) => {
            await onAdded();
            toast.success(`Added ${entry.symbol} to watchlist`);
            setPrefix("");
            setSelected(null);
            setTargetBuy("");
        },
        onError: (err: Error) => {
            const message = err instanceof ApiError ? err.detail : err.message;
            toast.error("Couldn't add to watchlist", { description: message });
        },
    });

    const results = searchQuery.data ?? [];

    return (
        <Card>
            <CardContent className="space-y-3 py-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
                    <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                            Stock
                        </Label>
                        {selected ? (
                            <div className="flex h-9 items-center justify-between rounded-md border bg-muted/30 px-3 text-sm">
                                <span>
                                    <span className="font-medium">
                                        {selected.symbol}
                                    </span>
                                    {selected.name ? (
                                        <span className="text-muted-foreground">
                                            {" "}
                                            {selected.name}
                                        </span>
                                    ) : null}
                                </span>
                                <button
                                    type="button"
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => setSelected(null)}
                                >
                                    change
                                </button>
                            </div>
                        ) : (
                            <Input
                                placeholder="Search symbol e.g. INFY"
                                value={prefix}
                                onChange={(e) => setPrefix(e.target.value)}
                            />
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                            Target buy (₹)
                        </Label>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="optional"
                            value={targetBuy}
                            onChange={(e) => setTargetBuy(e.target.value)}
                        />
                    </div>

                    <Button
                        type="button"
                        className="gap-1.5"
                        disabled={!selected?.isin || mutation.isPending}
                        onClick={() => mutation.mutate()}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        {mutation.isPending ? "Adding" : "Add"}
                    </Button>
                </div>

                {/* Search results */}
                {!selected && prefix.trim().length >= 2 && (
                    <div className="rounded-md border">
                        {searchQuery.isLoading && (
                            <p className="px-3 py-2 text-sm text-muted-foreground">
                                Searching
                            </p>
                        )}
                        {!searchQuery.isLoading && results.length === 0 && (
                            <p className="px-3 py-2 text-sm text-muted-foreground">
                                No matches.
                            </p>
                        )}
                        {results.map((r) => (
                            <button
                                key={`${r.exchange}:${r.symbol}`}
                                type="button"
                                disabled={!r.isin}
                                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50 disabled:opacity-50"
                                onClick={() => {
                                    setSelected(r);
                                    setPrefix("");
                                }}
                            >
                                <span className="font-medium">{r.symbol}</span>
                                <span className="truncate pl-3 text-muted-foreground">
                                    {r.name ?? (r.isin ? r.isin : "no ISIN")}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function WatchlistTable({
    rows,
    onRemoved,
}: {
    rows: WatchlistEntry[];
    onRemoved: () => Promise<void> | void;
}) {
    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Stock</TableHead>
                            <TableHead className="text-right">Current</TableHead>
                            <TableHead className="text-right">
                                Target buy
                            </TableHead>
                            <TableHead>Tags</TableHead>
                            <TableHead>Added</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row) => {
                            const cur = row.current_price
                                ? parseFloat(row.current_price)
                                : null;
                            const tgt = row.target_buy_price
                                ? parseFloat(row.target_buy_price)
                                : null;
                            const atOrBelow =
                                cur !== null && tgt !== null && cur <= tgt;
                            return (
                                <TableRow key={row.isin}>
                                    <TableCell>
                                        <div className="font-medium">
                                            {row.symbol}
                                        </div>
                                        {row.name ? (
                                            <div className="text-xs text-muted-foreground">
                                                {row.name}
                                            </div>
                                        ) : null}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        {cur !== null ? inr(cur) : "—"}
                                    </TableCell>
                                    <TableCell
                                        className={`text-right font-mono ${atOrBelow
                                                ? "text-emerald-600 dark:text-emerald-500"
                                                : ""
                                            }`}
                                    >
                                        {tgt !== null ? inr(tgt) : "—"}
                                    </TableCell>
                                    <TableCell>
                                        {row.tags && row.tags.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {row.tags.map((t) => (
                                                    <span
                                                        key={t}
                                                        className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                                                    >
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">
                                                —
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {dateTime(row.added_at)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <RemoveButton
                                            isin={row.isin}
                                            symbol={row.symbol}
                                            onRemoved={onRemoved}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function RemoveButton({
    isin,
    symbol,
    onRemoved,
}: {
    isin: string;
    symbol: string;
    onRemoved: () => Promise<void> | void;
}) {
    const mutation = useMutation({
        mutationFn: () => api.deleteWatchlist(isin),
        onSuccess: async () => {
            await onRemoved();
            toast.success(`Removed ${symbol} from watchlist`);
        },
        onError: (err: Error) => {
            const message = err instanceof ApiError ? err.detail : err.message;
            toast.error("Couldn't remove", { description: message });
        },
    });

    return (
        <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground hover:text-red-600"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
        >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
        </Button>
    );
}