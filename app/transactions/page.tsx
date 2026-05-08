"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    AlertCircle,
    ArrowDownLeft,
    ArrowLeft,
    ArrowUpRight,
    Layers,
    Pencil,
    Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { TransactionEditSheet } from "@/components/transaction-edit-sheet";
import { api, ApiError, type Transaction } from "@/lib/api";
import { dateTime, inr } from "@/lib/format";

type TxType = "BUY" | "SELL" | "SPLIT" | "BONUS" | "DIVIDEND";

const TYPE_OPTIONS: TxType[] = ["BUY", "SELL", "SPLIT", "BONUS", "DIVIDEND"];

export default function TransactionsPage() {
    const queryClient = useQueryClient();

    // Filters
    const [symbol, setSymbol] = useState("");
    const [type, setType] = useState<TxType | "all">("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    // Modals
    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
    const [deleteReason, setDeleteReason] = useState("");

    const query = useQuery({
        queryKey: ["transactions", "search", symbol, type, fromDate, toDate],
        queryFn: () =>
            api.searchTransactions({
                symbol: symbol || undefined,
                type: type === "all" ? undefined : type,
                from_date: fromDate || undefined,
                to_date: toDate || undefined,
                limit: 200,
            }),
    });

    const deleteMutation = useMutation({
        mutationFn: ({ tx, reason }: { tx: Transaction; reason: string }) =>
            api.deleteTransaction(tx._id, reason),
        onSuccess: async (response) => {
            await Promise.all([
                queryClient.refetchQueries({ queryKey: ["transactions"] }),
                queryClient.refetchQueries({ queryKey: ["holding", response.isin] }),
                queryClient.refetchQueries({ queryKey: ["dashboard"] }),
            ]);
            toast.success(`Deleted ${response.symbol} transaction`, {
                description: "Holding recomputed.",
            });
            setDeletingTx(null);
            setDeleteReason("");
        },
        onError: (err: Error) => {
            const message = err instanceof ApiError ? err.detail : err.message;
            toast.error("Delete failed", { description: message });
        },
    });

    const txs = query.data?.transactions ?? [];
    const total = query.data?.total ?? 0;

    const clearFilters = () => {
        setSymbol("");
        setType("all");
        setFromDate("");
        setToDate("");
    };

    const hasFilters = symbol || type !== "all" || fromDate || toDate;

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

                <header className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        All trades and corporate actions across your portfolio.
                        Edit or delete to fix mistakes — every change is logged for audit.
                    </p>
                </header>

                {/* Filter toolbar */}
                <Card className="mb-4">
                    <CardContent className="py-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                            <div className="space-y-1.5">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                    Symbol
                                </Label>
                                <Input
                                    placeholder="e.g. TRENT"
                                    value={symbol}
                                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                    Type
                                </Label>
                                <Select value={type} onValueChange={(v) => setType(v as TxType | "all")}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All types</SelectItem>
                                        {TYPE_OPTIONS.map((t) => (
                                            <SelectItem key={t} value={t}>
                                                {t}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                    From date
                                </Label>
                                <Input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                    To date
                                </Label>
                                <Input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="invisible text-xs">.</Label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 w-full"
                                    onClick={clearFilters}
                                    disabled={!hasFilters}
                                >
                                    Clear filters
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card>
                    <CardHeader>
                        <div className="flex items-baseline justify-between gap-3">
                            <div>
                                <CardTitle>{total} {total === 1 ? "transaction" : "transactions"}</CardTitle>
                                <CardDescription>
                                    Showing {txs.length} of {total} · {hasFilters ? "filtered" : "all"}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {query.isLoading && (
                            <div className="space-y-2">
                                {[0, 1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                ))}
                            </div>
                        )}
                        {query.error && (
                            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                                <AlertCircle className="h-4 w-4" />
                                <span>Couldn&apos;t load transactions: {query.error.message}</span>
                            </div>
                        )}
                        {!query.isLoading && txs.length === 0 && (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No transactions match your filters.
                            </p>
                        )}
                        {txs.length > 0 && (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-xs uppercase tracking-wider">Date</TableHead>
                                            <TableHead className="text-xs uppercase tracking-wider">Symbol</TableHead>
                                            <TableHead className="text-xs uppercase tracking-wider">Type</TableHead>
                                            <TableHead className="text-right text-xs uppercase tracking-wider">Qty</TableHead>
                                            <TableHead className="text-right text-xs uppercase tracking-wider">Price</TableHead>
                                            <TableHead className="text-right text-xs uppercase tracking-wider">Amount</TableHead>
                                            <TableHead className="text-right text-xs uppercase tracking-wider">Fees</TableHead>
                                            <TableHead className="text-xs uppercase tracking-wider">Notes</TableHead>
                                            <TableHead className="text-right text-xs uppercase tracking-wider">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {txs.map((tx) => (
                                            <TxRow
                                                key={tx._id}
                                                tx={tx}
                                                onEdit={() => setEditingTx(tx)}
                                                onDelete={() => setDeletingTx(tx)}
                                            />
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Edit sheet */}
            {editingTx && (
                <TransactionEditSheet
                    transaction={editingTx}
                    open={!!editingTx}
                    onOpenChange={(open) => !open && setEditingTx(null)}
                />
            )}

            {/* Delete confirmation */}
            <AlertDialog
                open={!!deletingTx}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeletingTx(null);
                        setDeleteReason("");
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                            <span className="block">
                                You&apos;re about to soft-delete this transaction:
                            </span>
                            {deletingTx && (
                                <span className="block rounded-md border bg-muted/30 p-3 text-xs">
                                    <strong>{deletingTx.symbol} {deletingTx.type}</strong> ·{" "}
                                    qty {deletingTx.quantity} @ {inr(deletingTx.price)}
                                    {" · "}
                                    {dateTime(deletingTx.trade_date)}
                                </span>
                            )}
                            <span className="block">
                                The holding will be recomputed; realized P&L history may change.
                                The transaction stays in the database (soft-delete) and the change
                                is logged in the audit trail.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                            Reason for delete (audit trail)
                        </Label>
                        <Textarea
                            rows={2}
                            placeholder="e.g. Duplicate import"
                            value={deleteReason}
                            onChange={(e) => setDeleteReason(e.target.value)}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={deleteMutation.isPending || deleteReason.trim().length < 3}
                            onClick={() => {
                                if (deletingTx) {
                                    deleteMutation.mutate({ tx: deletingTx, reason: deleteReason });
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteMutation.isPending ? "Deleting…" : "Delete transaction"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}

function TxRow({
    tx,
    onEdit,
    onDelete,
}: {
    tx: Transaction;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const isCorporateAction = tx.type === "SPLIT" || tx.type === "BONUS" || tx.type === "DIVIDEND";
    const qty = parseFloat(tx.quantity);
    const price = parseFloat(tx.price);
    const fees = parseFloat(tx.total_fees);
    const amount = qty * price;

    const TypeIcon =
        tx.type === "BUY" ? ArrowDownLeft : tx.type === "SELL" ? ArrowUpRight : Layers;
    const typeColor =
        tx.type === "BUY"
            ? "text-emerald-600 dark:text-emerald-500"
            : tx.type === "SELL"
                ? "text-red-600 dark:text-red-500"
                : "text-muted-foreground";

    return (
        <TableRow className="hover:bg-accent/40">
            <TableCell className="whitespace-nowrap font-mono text-xs">
                {new Date(tx.trade_date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    timeZone: "Asia/Kolkata",
                })}
            </TableCell>
            <TableCell>
                <Link
                    href={`/holdings/${tx.isin}`}
                    className="font-mono text-sm font-medium hover:underline"
                >
                    {tx.symbol}
                </Link>
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
            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                {fees > 0 ? inr(fees) : "—"}
            </TableCell>
            <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                {tx.notes || "—"}
            </TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} aria-label="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                        onClick={onDelete}
                        aria-label="Delete"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}