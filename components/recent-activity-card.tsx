"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, History, Pencil, Trash2 } from "lucide-react";
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
import { api, type TransactionAuditEntry } from "@/lib/api";
import { dateTime } from "@/lib/format";

const MAX_ENTRIES = 5;

export function RecentActivityCard() {
    const query = useQuery({
        queryKey: ["transactions", "audit", "recent", MAX_ENTRIES],
        queryFn: () => api.getRecentAudit(MAX_ENTRIES),
    });

    return (
        <Card>
            <CardHeader>
                <div className="flex items-baseline justify-between gap-2">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <History className="h-4 w-4" />
                            Recent activity
                        </CardTitle>
                        <CardDescription>
                            Latest edits and deletes from the audit log
                        </CardDescription>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                        <Link href="/transactions/audit">
                            View all
                            <ArrowRight className="h-3 w-3" />
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {query.isLoading && (
                    <div className="space-y-2">
                        {[0, 1, 2].map((i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                )}
                {query.data && query.data.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                        No transaction edits or deletes yet.
                    </p>
                )}
                {query.data && query.data.length > 0 && (
                    <ul className="space-y-2">
                        {query.data.map((entry) => (
                            <ActivityRow key={entry._id} entry={entry} />
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

function ActivityRow({ entry }: { entry: TransactionAuditEntry }) {
    const Icon = entry.action === "edit" ? Pencil : Trash2;
    const colorClass =
        entry.action === "edit"
            ? "text-amber-700 dark:text-amber-400"
            : "text-red-700 dark:text-red-400";

    const before = entry.before as Record<string, string | number | null | undefined>;
    const symbol = (before.symbol as string) ?? "?";
    const type = (before.type as string) ?? "?";

    // Build a short human summary
    let summary = "";
    if (entry.action === "delete") {
        summary = `Deleted ${type} of ${before.quantity} @ ₹${before.price}`;
    } else if (entry.after) {
        const after = entry.after as Record<string, string | number | null | undefined>;
        const changes: string[] = [];
        if (String(before.quantity ?? "") !== String(after.quantity ?? "")) {
            changes.push(`qty ${before.quantity} → ${after.quantity}`);
        }
        if (String(before.price ?? "") !== String(after.price ?? "")) {
            changes.push(`price ₹${before.price} → ₹${after.price}`);
        }
        if (String(before.trade_date ?? "") !== String(after.trade_date ?? "")) {
            changes.push("date changed");
        }
        if (String(before.total_fees ?? "") !== String(after.total_fees ?? "")) {
            changes.push("fees changed");
        }
        if (String(before.notes ?? "") !== String(after.notes ?? "")) {
            changes.push("notes changed");
        }
        summary = changes.length > 0 ? changes.join(", ") : "Edited";
    }

    return (
        <li className="flex items-start justify-between gap-3 rounded-md border bg-card px-3 py-2 text-sm hover:bg-accent/40">
            <div className="flex min-w-0 flex-1 items-start gap-2">
                <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${colorClass}`} />
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                        <Link
                            href={`/holdings/${entry.isin}`}
                            className="font-mono text-xs font-medium hover:underline"
                        >
                            {symbol}
                        </Link>
                        <Badge variant="outline" className="text-xs">
                            {type}
                        </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{summary}</p>
                    {entry.reason && (
                        <p className="mt-0.5 truncate text-xs italic text-muted-foreground/80">
                            &ldquo;{entry.reason}&rdquo;
                        </p>
                    )}
                </div>
            </div>
            <span className="shrink-0 whitespace-nowrap font-mono text-xs text-muted-foreground">
                {dateTime(entry.changed_at)}
            </span>
        </li>
    );
}