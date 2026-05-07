"use client";

import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BuySheet } from "./buy-sheet";
import { SellSheet } from "./sell-sheet";
import type { Holding } from "@/lib/api";

interface HoldingHeaderProps {
    holding: Holding;
}

export function HoldingHeader({ holding }: HoldingHeaderProps) {
    const [buyOpen, setBuyOpen] = useState(false);
    const [sellOpen, setSellOpen] = useState(false);

    return (
        <>
            <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
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

                    <div>
                        <div className="flex flex-wrap items-baseline gap-3">
                            <h1 className="font-mono text-3xl font-bold tracking-tight">{holding.symbol}</h1>
                            {holding.name && (
                                <span className="text-base text-muted-foreground">{holding.name}</span>
                            )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <Badge variant="outline" className="text-xs">{holding.exchange}</Badge>
                            {holding.sector && <Badge variant="outline" className="text-xs">{holding.sector}</Badge>}
                            {holding.industry && <Badge variant="secondary" className="text-xs">{holding.industry}</Badge>}
                        </div>
                    </div>
                </div>

                {/* Buy / Sell buttons */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBuyOpen(true)}
                        className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                    >
                        <TrendingUp className="h-3.5 w-3.5" />
                        Buy more
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSellOpen(true)}
                        className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                        <TrendingDown className="h-3.5 w-3.5" />
                        Sell
                    </Button>
                </div>
            </header>

            <BuySheet holding={holding} open={buyOpen} onOpenChange={setBuyOpen} />
            <SellSheet holding={holding} open={sellOpen} onOpenChange={setSellOpen} />
        </>
    );
}