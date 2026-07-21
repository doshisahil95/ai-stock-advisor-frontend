"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { BuySheet, type BuyInstrument } from "@/components/buy-sheet";
import { api, type InstrumentSearchResult } from "@/lib/api";

// #54: Independent add-a-holding entry point. Today the only "buy" affordance
// adds MORE of an already-held stock (BuySheet from the holding drill-down).
// This resolves a not-yet-held stock via the existing /instruments/search
// endpoint (the StockResearchPanel precedent) and opens BuySheet in add-holding
// mode, which records a brand-new purchase through the existing create path
// (POST /portfolio/holdings -> add_buy -> recompute_holding). No backend change.
export function AddHoldingDialog() {
    // Two-step flow: (1) search sheet to pick the instrument, (2) BuySheet to
    // record the purchase. Kept as two sheets so BuySheet stays untouched in
    // structure (it just receives `instrument` instead of `holding`).
    const [searchOpen, setSearchOpen] = useState(false);
    const [term, setTerm] = useState("");
    const [selected, setSelected] = useState<BuyInstrument | null>(null);
    const [buyOpen, setBuyOpen] = useState(false);

    const prefix = term.trim().toUpperCase();
    const searchQuery = useQuery({
        queryKey: ["instrument-search", prefix],
        queryFn: () => api.searchInstruments(prefix, 8),
        enabled: searchOpen && prefix.length >= 2,
    });

    const results = (searchQuery.data ?? []).filter(
        (r): r is InstrumentSearchResult & { isin: string } => Boolean(r.isin),
    );

    function pick(r: InstrumentSearchResult & { isin: string }) {
        setSelected({
            symbol: r.symbol,
            exchange: r.exchange,
            isin: r.isin,
            name: r.name ?? null,
        });
        // Close the search sheet, open the buy sheet.
        setSearchOpen(false);
        setBuyOpen(true);
    }

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => {
                    setTerm("");
                    setSearchOpen(true);
                }}
                className="h-8 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
            >
                <Plus className="h-3.5 w-3.5" />
                Add holding
            </Button>

            <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
                <SheetContent className="flex flex-col gap-6 overflow-y-auto sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <Search className="h-5 w-5" />
                            Add a holding
                        </SheetTitle>
                        <SheetDescription>
                            Find a stock you don&apos;t hold yet, then record your
                            purchase. This creates a new holding.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex flex-col gap-3 px-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                Search by symbol
                            </Label>
                            <Input
                                autoFocus
                                value={term}
                                onChange={(e) => setTerm(e.target.value)}
                                placeholder="Type a symbol, e.g. INFY"
                            />
                        </div>

                        {prefix.length < 2 && (
                            <p className="text-xs text-muted-foreground">
                                Type at least 2 characters to search.
                            </p>
                        )}

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
                                        onClick={() => pick(r)}
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
                    </div>
                </SheetContent>
            </Sheet>

            {selected && (
                <BuySheet
                    instrument={selected}
                    open={buyOpen}
                    onOpenChange={(o) => {
                        setBuyOpen(o);
                        // Clear the selection once the buy sheet fully closes so a
                        // subsequent "Add holding" starts from a clean search.
                        if (!o) setSelected(null);
                    }}
                />
            )}
        </>
    );
}
