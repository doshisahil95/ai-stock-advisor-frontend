"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { dateTime } from "@/lib/format";

/**
 * Header badge that summarizes reconciliation state at a glance.
 *
 * Three states:
 * - "synced" (green): latest manual snapshot has no drift
 * - "drift" (red): latest manual snapshot has has_drift=true
 * - "stale" (amber): no manual snapshot in last 30 days OR none exists
 */
export function ReconciliationBadge() {
    const { data, isLoading } = useQuery({
        queryKey: ["reconciliation", "latest", "manual"],
        queryFn: () => api.getLatestReconciliation("manual"),
    });

    if (isLoading) return null;

    const snapshot = data;
    const now = Date.now();
    const takenAt = snapshot ? new Date(snapshot.taken_at).getTime() : 0;
    const daysSince = snapshot
        ? Math.floor((now - takenAt) / (1000 * 60 * 60 * 24))
        : null;

    let state: "synced" | "drift" | "stale";
    let tooltipText: string;

    if (!snapshot) {
        state = "stale";
        tooltipText = "No reconciliation snapshot yet. Click to set baseline.";
    } else if (snapshot.has_drift) {
        state = "drift";
        tooltipText = `Drift detected on ${dateTime(snapshot.taken_at)}. Click to investigate.`;
    } else if (daysSince !== null && daysSince > 30) {
        state = "stale";
        tooltipText = `Last reconciled ${daysSince} days ago. Consider a fresh check.`;
    } else {
        state = "synced";
        tooltipText = `Reconciled ${dateTime(snapshot.taken_at)}. No drift.`;
    }

    const config = {
        synced: {
            Icon: CheckCircle2,
            className: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400",
            label: "Reconciled",
        },
        drift: {
            Icon: AlertTriangle,
            className: "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400",
            label: "Drift detected",
        },
        stale: {
            Icon: HelpCircle,
            className: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400",
            label: snapshot ? `${daysSince}d old` : "Not reconciled",
        },
    }[state];

    const { Icon, className, label } = config;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Link
                    href="/reconciliation"
                    aria-label="Reconciliation status"
                >
                    <Badge variant="outline" className={`gap-1.5 ${className} hover:opacity-80`}>
                        <Icon className="h-3 w-3" />
                        <span className="text-xs font-medium">{label}</span>
                    </Badge>
                </Link>
            </TooltipTrigger>
            <TooltipContent>
                <p className="text-xs">{tooltipText}</p>
            </TooltipContent>
        </Tooltip>
    );
}