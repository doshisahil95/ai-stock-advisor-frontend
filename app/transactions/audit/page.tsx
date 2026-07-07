"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { api, type TransactionAuditEntry } from "@/lib/api";
import { dateTime } from "@/lib/format";

export default function AuditTrailPage() {
    const query = useQuery({
        queryKey: ["transactions", "audit", "recent"],
        queryFn: () => api.getRecentAudit(100),
    });

    return (
        <main className="min-h-screen bg-background">
            <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 lg:px-8">
                <div className="mb-6 flex flex-wrap items-center gap-1">
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
                    <Link href="/transactions" className="inline-flex">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back to transactions
                        </Button>
                    </Link>
                </div>

                <header className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight">Audit Trail</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Append-only record of every transaction edit and delete. Read-only
                        and immutable. Use this to explain retroactive changes to realized
                        P&amp;L (especially around tax season).
                    </p>
                </header>

                <Card className="mb-4 border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20">
                    <CardContent className="py-4 text-xs text-muted-foreground">
                        This log is automatically populated whenever a transaction is edited
                        or deleted via the Transactions page. Each entry includes the
                        field-level change, the user-supplied reason, and the timestamp.
                        This trail cannot be modified or deleted from the API.
                    </CardContent>
                </Card>

                {query.isLoading && (
                    <div className="space-y-3">
                        {[0, 1, 2].map((i) => (
                            <Skeleton key={i} className="h-32 w-full" />
                        ))}
                    </div>
                )}

                {query.error && (
                    <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                        <AlertCircle className="h-4 w-4" />
                        <span>Couldn&apos;t load audit log: {query.error.message}</span>
                    </div>
                )}

                {query.data && query.data.length === 0 && (
                    <Card>
                        <CardContent className="py-12 text-center text-sm text-muted-foreground">
                            No audit entries yet. The log starts populating from your first
                            transaction edit or delete.
                        </CardContent>
                    </Card>
                )}

                {query.data && query.data.length > 0 && (
                    <div className="space-y-3">
                        {query.data.map((entry) => (
                            <AuditCard key={entry._id} entry={entry} />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

function AuditCard({ entry }: { entry: TransactionAuditEntry }) {
    const Icon = entry.action === "edit" ? Pencil : Trash2;
    const actionColor =
        entry.action === "edit"
            ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400"
            : "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400";

    const before = entry.before as Record<
        string,
        string | number | null | undefined
    >;
    const after = entry.after as Record<
        string,
        string | number | null | undefined
    > | null;
    const symbol = (before.symbol as string) ?? "?";
    const type = (before.type as string) ?? "?";

    // Diff: only show fields that actually changed
    const diffFields: string[] = [];
    if (after) {
        for (const k of ["quantity", "price", "trade_date", "total_fees", "notes"]) {
            if (String(before[k] ?? "") !== String(after[k] ?? "")) {
                diffFields.push(k);
            }
        }
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`gap-1 ${actionColor}`}>
                            <Icon className="h-3 w-3" />
                            {entry.action.toUpperCase()}
                        </Badge>
                        <span className="font-mono text-sm font-medium">{symbol}</span>
                        <Badge variant="outline" className="text-xs">
                            {type}
                        </Badge>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                        {dateTime(entry.changed_at)}
                    </span>
                </div>
                {entry.reason && (
                    <CardDescription className="italic">
                        &ldquo;{entry.reason}&rdquo;
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="pt-0 text-xs">
                {entry.action === "delete" ? (
                    <DeletedSnapshot before={before} />
                ) : diffFields.length > 0 ? (
                    <FieldDiff before={before} after={after!} fields={diffFields} />
                ) : (
                    <p className="text-muted-foreground">
                        (No field-level changes recorded for this entry.)
                    </p>
                )}
                <Separator className="my-2" />
                <p className="text-xs text-muted-foreground">
                    Transaction:{" "}
                    <Link
                        href={`/holdings/${entry.isin}`}
                        className="font-mono hover:underline"
                    >
                        {entry.isin}
                    </Link>{" "}
                    · ID:{" "}
                    <span className="font-mono">{entry.transaction_id.slice(-8)}</span>
                </p>
            </CardContent>
        </Card>
    );
}

function DeletedSnapshot({
    before,
}: {
    before: Record<string, string | number | null | undefined>;
}) {
    return (
        <div className="rounded-md border bg-muted/30 p-2 font-mono text-xs">
            <span className="text-muted-foreground">Deleted: </span>
            qty {String(before.quantity)} @ ₹{String(before.price)} on{" "}
            {before.trade_date
                ? new Date(String(before.trade_date)).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    timeZone: "Asia/Kolkata",
                })
                : "—"}
            {before.total_fees && Number(before.total_fees) > 0 && (
                <> · fees ₹{String(before.total_fees)}</>
            )}
        </div>
    );
}

function FieldDiff({
    before,
    after,
    fields,
}: {
    before: Record<string, string | number | null | undefined>;
    after: Record<string, string | number | null | undefined>;
    fields: string[];
}) {
    const fmt = (v: unknown, k: string) => {
        if (v === null || v === undefined || v === "") return "—";
        if (k === "trade_date") {
            return new Date(String(v)).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                timeZone: "Asia/Kolkata",
            });
        }
        return String(v);
    };

    const labelOf: Record<string, string> = {
        quantity: "Quantity",
        price: "Price",
        trade_date: "Trade date",
        total_fees: "Fees",
        notes: "Notes",
    };

    return (
        <div className="space-y-1">
            {fields.map((k) => (
                <div key={k} className="flex items-baseline gap-2 font-mono text-xs">
                    <span className="w-24 text-muted-foreground">{labelOf[k] ?? k}:</span>
                    <span className="line-through opacity-60">{fmt(before[k], k)}</span>
                    <span className="text-muted-foreground">→</span>
                    <span>{fmt(after[k], k)}</span>
                </div>
            ))}
        </div>
    );
}
