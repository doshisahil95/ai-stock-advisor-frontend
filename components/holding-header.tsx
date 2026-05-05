"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Holding } from "@/lib/api";

interface HoldingHeaderProps {
    holding: Holding;
}

export function HoldingHeader({ holding }: HoldingHeaderProps) {
    return (
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
                <Link href="/" className="inline-flex">
                    <Button variant="ghost" size="sm" className="-ml-3 h-8 gap-2 text-muted-foreground hover:text-foreground">
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
        </header>
    );
}