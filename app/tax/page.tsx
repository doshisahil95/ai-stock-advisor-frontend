"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, Printer } from "lucide-react";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type CapitalGainsBucket } from "@/lib/api";
import { colorForChange, dateShort, dateTime, inr, inrSigned } from "@/lib/format";

/** The Indian FY ("YYYY-YY") containing `now`, evaluated in IST. */
function currentFy(): string {
    const ist = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );
    // getMonth() is 0-indexed; April === 3.
    const y = ist.getMonth() >= 3 ? ist.getFullYear() : ist.getFullYear() - 1;
    return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

/** `count` financial years, newest first, ending at the current FY. */
function fyOptions(count = 7): string[] {
    const startY = parseInt(currentFy().slice(0, 4), 10);
    return Array.from({ length: count }, (_, i) => {
        const y = startY - i;
        return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
    });
}

export default function TaxPage() {
    const [fy, setFy] = useState<string>(currentFy());

    const cgQuery = useQuery({
        queryKey: ["tax", "capital-gains", fy],
        queryFn: () => api.getCapitalGains(fy),
    });

    const data = cgQuery.data;

    return (
        <main className="min-h-screen bg-background">
            <div className="mx-auto max-w-5xl px-4 py-6 print:px-0 md:px-6 lg:px-8">
                {/* Top bar (hidden on print) */}
                <div className="mb-6 print:hidden">
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

                {/* Header (printable) */}
                <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Capital Gains — STCG / LTCG
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Per-lot realized capital gains for the Indian financial year
                            (1 Apr → 31 Mar, IST). Long-term = listed equity held more than
                            12 months. Read-only over the transaction ledger; cost basis
                            already reflects the IT-Act (incl. §49(2C) demerger) treatment.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* FY on print */}
                        <span className="hidden text-sm font-medium print:inline">
                            FY {fy}
                        </span>
                        <div className="print:hidden">
                            <Select value={fy} onValueChange={setFy}>
                                <SelectTrigger className="w-32" aria-label="Financial year">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {fyOptions().map((f) => (
                                        <SelectItem key={f} value={f}>
                                            FY {f}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 print:hidden"
                            onClick={() => window.print()}
                        >
                            <Printer className="h-3.5 w-3.5" />
                            Print
                        </Button>
                    </div>
                </header>

                {/* Error */}
                {cgQuery.error && (
                    <Card className="mb-6 border-red-200 dark:border-red-900">
                        <CardContent className="py-4 text-sm text-red-700 dark:text-red-300">
                            Couldn&apos;t load capital gains: {cgQuery.error.message}
                        </CardContent>
                    </Card>
                )}

                {/* Summary cards */}
                {cgQuery.isLoading ? (
                    <Skeleton className="mb-6 h-32" />
                ) : (
                    data && (
                        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                            <SummaryCard title="Short-term (STCG)" bucket={data.summary.stcg} />
                            <SummaryCard title="Long-term (LTCG)" bucket={data.summary.ltcg} />
                            <SummaryCard title="Total realized" bucket={data.summary.total} emphasize />
                        </div>
                    )
                )}

                {/* Lots table */}
                {cgQuery.isLoading && <Skeleton className="h-96" />}
                {data && data.lots.length === 0 && (
                    <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No lots were sold in FY {fy}. Nothing to report.
                        </CardContent>
                    </Card>
                )}
                {data && data.lots.length > 0 && (
                    <Card className="break-inside-avoid">
                        <CardHeader>
                            <CardTitle className="text-base">
                                Disposals in FY {fy}
                            </CardTitle>
                            <CardDescription>
                                {data.summary.total.lot_count} lot
                                {data.summary.total.lot_count === 1 ? "" : "s"} · one row per
                                FIFO buy-lot consumed by a sell
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Stock</TableHead>
                                        <TableHead>Buy</TableHead>
                                        <TableHead>Sell</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Buy cost</TableHead>
                                        <TableHead className="text-right">Proceeds</TableHead>
                                        <TableHead className="text-right">Gain</TableHead>
                                        <TableHead className="text-right">Days</TableHead>
                                        <TableHead>Type</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.lots.map((lot, i) => (
                                        <TableRow key={`${lot.isin}-${lot.sell_date}-${lot.buy_date}-${i}`}>
                                            <TableCell>
                                                <span className="font-medium">{lot.symbol}</span>
                                                {lot.name && (
                                                    <span className="block text-xs text-muted-foreground">
                                                        {lot.name}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>{dateShort(lot.buy_date, "with-year")}</TableCell>
                                            <TableCell>{dateShort(lot.sell_date, "with-year")}</TableCell>
                                            <TableCell className="text-right font-mono">{lot.quantity}</TableCell>
                                            <TableCell className="text-right font-mono">{inr(lot.buy_cost)}</TableCell>
                                            <TableCell className="text-right font-mono">{inr(lot.sell_proceeds)}</TableCell>
                                            <TableCell className={`text-right font-mono ${colorForChange(lot.gain)}`}>
                                                {inrSigned(lot.gain)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{lot.holding_period_days}</TableCell>
                                            <TableCell>
                                                <Badge variant={lot.gain_type === "LTCG" ? "secondary" : "outline"}>
                                                    {lot.gain_type}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Footer for print */}
                <footer className="mt-8 hidden border-t pt-4 text-xs text-muted-foreground print:block">
                    <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        <span>
                            Capital gains FY {fy} · Generated from Portfolio Advisor ·{" "}
                            {dateTime(new Date().toISOString())}
                        </span>
                    </div>
                </footer>
            </div>
        </main>
    );
}

function SummaryCard({
    title,
    bucket,
    emphasize = false,
}: {
    title: string;
    bucket: CapitalGainsBucket;
    emphasize?: boolean;
}) {
    return (
        <Card className={emphasize ? "border-foreground/20" : undefined}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className={`font-mono text-xl ${colorForChange(bucket.realized_gain)}`}>
                    {inrSigned(bucket.realized_gain)}
                </p>
                <dl className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                        <dt>Proceeds</dt>
                        <dd className="font-mono">{inr(bucket.proceeds)}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt>Cost</dt>
                        <dd className="font-mono">{inr(bucket.cost)}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt>Lots</dt>
                        <dd className="font-mono">{bucket.lot_count}</dd>
                    </div>
                </dl>
            </CardContent>
        </Card>
    );
}
