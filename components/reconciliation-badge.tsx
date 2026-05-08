"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { dateTime } from "@/lib/format";

/**
 * Header badge that summarizes broker-reconciliation state.
 *
 * Color/label is driven by the latest MANUAL snapshot (the only kind that compares
 * with ICICI). The tooltip also surfaces the latest AUTO snapshot so it's clear
 * the cron is still running even when no manual check has happened.
 */
export function ReconciliationBadge() {
    const manualQuery = useQuery({
        queryKey: ["reconciliation", "latest", "manual"],
        queryFn: () => api.getLatestReconciliation("manual"),
    });
    const autoQuery = useQuery({
        queryKey: ["reconciliation", "latest", "auto"],
        queryFn: () => api.getLatestReconciliation("auto"),
    });

    if (manualQuery.isLoading || autoQuery.isLoading) return null;

    const manual = manualQuery.data;
    const auto = autoQuery.data;
    const now = Date.now();
    const manualTakenAt = manual ? new Date(manual.taken_at).getTime() : 0;
    const daysSinceManual = manual
        ? Math.floor((now - manualTakenAt) / (1000 * 60 * 60 * 24))
        : null;

    let state: "synced" | "drift" | "stale";
    let primaryLine: string;

    if (!manual) {
        state = "stale";
        primaryLine = "No broker check yet. Click to set baseline.";
    } else if (manual.has_drift) {
        state = "drift";
        primaryLine = `Drift detected on broker check ${dateTime(manual.taken_at)}.`;
    } else if (daysSinceManual !== null && daysSinceManual > 30) {
        state = "stale";
        primaryLine = `Last broker check: ${dateTime(manual.taken_at)} (${daysSinceManual}d ago). Consider a fresh check.`;
    } else {
        state = "synced";
        primaryLine = `Last broker check: ${dateTime(manual.taken_at)}. No drift.`;
    }

    const autoLine = auto
        ? `Latest auto-snapshot (system-side only): ${dateTime(auto.taken_at)}.`
        : "No auto-snapshot recorded yet.";

    const config = {
        synced: {
            Icon: CheckCircle2,
            className:
                "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50",
            label: "Reconciled",
        },
        drift: {
            Icon: AlertTriangle,
            className:
                "border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50",
            label: "Drift detected",
        },
        stale: {
            Icon: HelpCircle,
            className:
                "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50",
            label: manual ? `${daysSinceManual}d old` : "Not reconciled",
        },
    }[state];

    const { Icon, className, label } = config;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className={`h-8 gap-1.5 ${className}`}
                >
                    <Link href="/reconciliation" aria-label="Reconciliation status">
                        <Icon className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">{label}</span>
                    </Link>
                </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
                <p className="text-xs">{primaryLine}</p>
                <p className="mt-1 text-xs text-muted-foreground">{autoLine}</p>
            </TooltipContent>
        </Tooltip>
    );
}