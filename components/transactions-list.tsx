"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Layers } from "lucide-react";
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

export function TransactionsList({ isin }: TransactionsListProps) {
    const { data, isLoading, error } = useQuery({
        queryKey: ["transactions", isin],
        queryFn: () => api.getHoldingTransactions(isin),
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                    All trades and corporate actions, oldest first
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
                {data && data.length > 0 && (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs uppercase tracking-wider">Date</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider">Type</TableHead>
                                    <TableHead className="text-right text-xs uppercase tracking-wider">Qty</TableHead>
                                    <TableHead className="text-right text-xs uppercase tracking-wider">Price</TableHead>
                                    <TableHead className="text-right text-xs uppercase tracking-wider">Amount</TableHead>
                                    <TableHead className="text-right text-xs uppercase tracking-wider">Fees</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((tx) => (
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
    const isCorporateAction = tx.type === "SPLIT" || tx.type === "BONUS" || tx.type === "DIVIDEND";

    const qty = parseFloat(tx.quantity);
    const price = parseFloat(tx.price);
    const fees = parseFloat(tx.total_fees);
    const amount = qty * price;

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