"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChatPanel } from "@/components/chat-panel";
import { api, type InstrumentSearchResult } from "@/lib/api";

// Entry point for chatting about a stock the user does NOT own (buy research).
// Resolves a symbol -> ISIN via the existing /instruments/search endpoint, then
// reuses ChatPanel bound to POST /chat/holdings/{isin}; the backend pulls fresh
// fundamentals + news on demand for not-yet-owned names.
export function StockResearchPanel() {
    const [term, setTerm] = useState("");
    const [selected, setSelected] = useState<InstrumentSearchResult | null>(null);

    const prefix = term.trim().toUpperCase();
    const searchQuery = useQuery({
        queryKey: ["instrument-search", prefix],
        queryFn: () => api.searchInstruments(prefix, 8),
        enabled: prefix.length >= 2 && !selected,
    });

    const results = (searchQuery.data ?? []).filter(
        (r): r is InstrumentSearchResult & { isin: string } => Boolean(r.isin),
    );

    if (selected && selected.isin) {
        const isin = selected.isin;
        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                    <p className="text-sm">
                        Researching{" "}
                        <span className="font-semibold">{selected.symbol}</span>
                        {selected.name ? (
                            <span className="text-muted-foreground">
                                {" "}
                                · {selected.name}
                            </span>
                        ) : null}
                    </p>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1"
                        onClick={() => {
                            setSelected(null);
                            setTerm("");
                        }}
                    >
                        <X className="h-3.5 w-3.5" /> Change
                    </Button>
                </div>
                <ChatPanel
                    title={`Research: ${selected.symbol}`}
                    description="Buy-side research on a stock you don't own. Pulls fresh fundamentals & news on demand. Advisory only."
                    placeholder={`Ask about ${selected.symbol} — valuation, news, risks, is the setup interesting…`}
                    historyParams={{ scope: "holding", isin }}
                    send={(query, sentiment) =>
                        api.chatHolding(isin, {
                            query,
                            sentiment_overlay: sentiment,
                        })
                    }
                />
            </div>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Search className="h-4 w-4" />
                    Research any NSE stock
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Look up a stock you don&apos;t own and chat about it as a
                    potential buy.
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                <Input
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="Type a symbol, e.g. INFY"
                />
                {prefix.length >= 2 && (
                    <div className="overflow-hidden rounded-md border">
                        {searchQuery.isLoading && (
                            <p className="px-3 py-2 text-sm text-muted-foreground">
                                Searching…
                            </p>
                        )}
                        {searchQuery.data && results.length === 0 && (
                            <p className="px-3 py-2 text-sm text-muted-foreground">
                                No matches.
                            </p>
                        )}
                        {results.map((r) => (
                            <button
                                key={`${r.exchange}-${r.symbol}`}
                                type="button"
                                onClick={() => setSelected(r)}
                                className="flex w-full items-baseline justify-between gap-3 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted/40"
                            >
                                <span className="font-medium">{r.symbol}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {r.name}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}