"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowDownLeft, ArrowUp, ArrowUpDown, ArrowUpRight, Layers } from "lucide-react";
import { useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type Transaction } from "@/lib/api";
import { inr } from "@/lib/format";

interface TransactionsListProps {
    isin: string;
}

type SortKey = "trade_date" | "type" | "quantity" | "price" | "amount" | "fees";
type SortDir = "asc" | "desc";

const HEADERS: { key: SortKey; label: string; align: "left" | "right" }[] = [
    { key: "trade_date", label: "Date", align: "left" },
    { key: "type", label: "Type", align: "left" },
    { key: "quantity", label: "Qty", align: "right" },
    { key: "price", label: "Price", align: "right" },
    { key: "amount", label: "Amount", align: "right" },
    { key: "fees", label: "Fees", align: "right" },
];

// #78 U7-d: prefer the backend-authoritative trade_value over a client-side
// qty*price recompute (they can disagree by rounding/disclosure conventions).
function txAmount(tx: Transaction): number {
    if (tx.trade_value != null && tx.trade_value !== "") {
        const v = parseFloat(tx.trade_value);
        if (!Number.isNaN(v)) return v;
    }
    return parseFloat(tx.quantity) * parseFloat(tx.price);
}

function getValue(tx: Transaction, key: SortKey): number | string {
    switch (key) {
        case "trade_date":
            return new Date(tx.trade_date).getTime();
        case "type":
            return tx.type;
        case "quantity":
            return parseFloat(tx.quantity);
        case "price":
            return parseFloat(tx.price);
        case "amount":
            return txAmount(tx);
        case "fees":
            return parseFloat(tx.total_fees);
    }
}

export function TransactionsList({ isin }: TransactionsListProps) {
    const { data, isLoading, error } = useQuery({
        queryKey: ["transactions", isin],
        queryFn: () => api.getHoldingTransactions(isin),
    });

    const [sortKey, setSortKey] = useState<SortKey>("trade_date");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    const sorted = useMemo(() => {
        if (!data) return [];
        const copy = [...data];
        copy.sort((a, b) => {
            const av = getValue(a, sortKey);
            const bv = getValue(b, sortKey);
            const cmp =
                typeof av === "number" && typeof bv === "number"
                    ? av - bv
                    : String(av).localeCompare(String(bv));
            return sortDir === "asc" ? cmp : -cmp;
        });
        return copy;
    }, [data, sortKey, sortDir]);

    const handleSort = (key: SortKey) => {
        if (key === sortKey) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            // #79 U8-e: was a dead ternary (both branches "desc"). A new column
            // starts descending.
            setSortDir("desc");
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                    All trades and corporate actions · click any column to sort
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading && (
                    <div className="space-y-2">
                        {[0, 1, 2].map((i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                )}
                {error && (
                    <p className="text-sm text-muted-foreground">
                        Couldn&apos;t load transactions.
                    </p>
                )}
                {data && data.length === 0 && (
                    <p className="text-sm text-muted-foreground">No transactions yet.</p>
                )}
                {sorted.length > 0 && (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {HEADERS.map((h) => (
                                        <TableHead
                                            key={h.key}
                                            className={`cursor-pointer select-none whitespace-nowrap text-xs uppercase tracking-wider ${h.align === "right" ? "text-right" : "text-left"
                                                }`}
                                            onClick={() => handleSort(h.key)}
                                        >
                                            <span
                                                className={`inline-flex items-center gap-1 ${h.align === "right" ? "justify-end" : ""
                                                    }`}
                                            >
                                                {h.label}
                                                <SortIcon active={sortKey === h.key} dir={sortDir} />
                                            </span>
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sorted.map((tx) => (
                                    <TxRow key={tx._id} tx={tx} />
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function TxRow({ tx }: { tx: Transaction }) {
    const isCorporateAction =
        tx.type === "SPLIT" || tx.type === "BONUS" || tx.type === "DIVIDEND";

    const qty = parseFloat(tx.quantity);
    const price = parseFloat(tx.price);
    const fees = parseFloat(tx.total_fees);
    const amount = txAmount(tx); // #78 U7-d: backend trade_value when present

    const TypeIcon =
        tx.type === "BUY"
            ? ArrowDownLeft
            : tx.type === "SELL"
                ? ArrowUpRight
                : Layers;

    const typeColor =
        tx.type === "BUY"
            ? "text-emerald-600 dark:text-emerald-500"
            : tx.type === "SELL"
                ? "text-red-600 dark:text-red-500"
                : "text-muted-foreground";

    return (
        <TableRow className="hover:bg-accent/40">
            <TableCell className="font-mono text-sm">
                {new Date(tx.trade_date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                })}
            </TableCell>
            <TableCell>
                <Badge variant="outline" className={`gap-1 ${typeColor}`}>
                    <TypeIcon className="h-3 w-3" />
                    {tx.type}
                </Badge>
            </TableCell>
            <TableCell className="text-right font-mono text-sm">
                {isCorporateAction ? "—" : qty}
            </TableCell>
            <TableCell className="text-right font-mono text-sm">
                {isCorporateAction ? "—" : inr(price)}
            </TableCell>
            <TableCell className="text-right font-mono text-sm">
                {isCorporateAction ? "—" : inr(amount)}
            </TableCell>
            <TableCell className="text-right font-mono text-sm text-muted-foreground">
                {fees > 0 ? inr(fees) : "—"}
            </TableCell>
        </TableRow>
    );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
    if (!active) {
        return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    }
    return dir === "asc" ? (
        <ArrowUp className="h-3 w-3" />
    ) : (
        <ArrowDown className="h-3 w-3" />
    );
}