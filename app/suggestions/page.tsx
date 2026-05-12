"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, RefreshCw, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SuggestionCard } from "@/components/suggestion-card";
import { api, FeedbackAction, ApiError } from "@/lib/api";
import { dateTime, pct, colorForChange } from "@/lib/format";

export default function SuggestionsPage() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("latest");

    const latestQuery = useQuery({
        queryKey: ["suggestions", "latest"],
        queryFn: api.getLatestSuggestionRun,
        retry: (failureCount, error) => {
            // Don't retry on 404 (no runs yet)
            if (error instanceof ApiError && error.status === 404) return false;
            return failureCount < 2;
        },
    });

    const performanceQuery = useQuery({
        queryKey: ["suggestions", "performance"],
        queryFn: api.getSuggestionPerformance,
        enabled: activeTab === "performance",
    });

    const historyQuery = useQuery({
        queryKey: ["suggestions", "history"],
        queryFn: () => api.listSuggestionRuns(20, 0),
        enabled: activeTab === "history",
    });

    const feedbackMutation = useMutation({
        mutationFn: ({ isin, action, note }: { isin: string; action: FeedbackAction; note?: string }) =>
            api.submitFeedback(isin, { action, note }),
        onSuccess: (_, vars) => {
            const verb = vars.action === "acted" ? "Marked as acted on"
                : vars.action === "passed" ? "Marked as passed"
                    : "Rejected for 90 days";
            toast.success(`${verb}: ${vars.isin}`);
            queryClient.invalidateQueries({ queryKey: ["suggestions"] });
        },
        onError: (error) => {
            toast.error(`Feedback failed: ${error.message}`);
        },
    });

    const handleFeedback = (isin: string, action: FeedbackAction) => {
        feedbackMutation.mutate({ isin, action });
    };

    return (
        <main className="min-h-screen bg-background">
            <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 lg:px-8">
                {/* Top bar */}
                <div className="mb-6">
                    <Link href="/" className="inline-flex">
                        <Button variant="ghost" size="sm" className="-ml-3 h-8 gap-2 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back to portfolio
                        </Button>
                    </Link>
                </div>

                {/* Header */}
                <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Weekly Suggestions</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {latestQuery.data
                                ? `Latest run: ${latestQuery.data.run_date_ist} | Universe: ${latestQuery.data.universe_size} | Eligible: ${latestQuery.data.candidates_post_gates}`
                                : "AI-ranked NIFTY 100 candidates with full dossiers."}
                        </p>
                    </div>
                    {latestQuery.data && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => latestQuery.refetch()}
                            disabled={latestQuery.isFetching}
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${latestQuery.isFetching ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                    )}
                </header>

                {/* Empty state — no runs yet */}
                {latestQuery.error instanceof ApiError && latestQuery.error.status === 404 && (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
                            <p className="mt-3 text-sm text-muted-foreground">
                                No suggestion runs available yet.
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Run <code className="rounded bg-muted px-1 py-0.5">scripts/run_weekly_suggestions.py</code> on the server.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Generic error */}
                {latestQuery.error && !(latestQuery.error instanceof ApiError && latestQuery.error.status === 404) && (
                    <div className="mb-6 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                        <AlertCircle className="h-4 w-4" />
                        <span>Could not load suggestions: {latestQuery.error.message}</span>
                    </div>
                )}

                {/* Loading */}
                {latestQuery.isLoading && (
                    <div className="space-y-4">
                        <Skeleton className="h-32" />
                        <Skeleton className="h-64" />
                        <Skeleton className="h-64" />
                    </div>
                )}

                {/* Loaded */}
                {latestQuery.data && (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList>
                            <TabsTrigger value="latest">Latest Run</TabsTrigger>
                            <TabsTrigger value="performance">Performance</TabsTrigger>
                            <TabsTrigger value="history">History</TabsTrigger>
                        </TabsList>

                        <TabsContent value="latest" className="space-y-4 pt-4">
                            {latestQuery.data.top_candidates.length === 0 ? (
                                <Card>
                                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                                        No eligible candidates this week.
                                    </CardContent>
                                </Card>
                            ) : (
                                latestQuery.data.top_candidates.map((c) => {
                                    const dossier = latestQuery.data!.dossiers.find((d) => d.isin === c.isin);
                                    return (
                                        <SuggestionCard
                                            key={c.isin}
                                            candidate={c}
                                            dossier={dossier}
                                            onFeedback={handleFeedback}
                                            feedbackPending={feedbackMutation.isPending}
                                        />
                                    );
                                })
                            )}
                        </TabsContent>

                        <TabsContent value="performance" className="pt-4">
                            {performanceQuery.isLoading && <Skeleton className="h-64" />}
                            {performanceQuery.data && (
                                <PerformanceView data={performanceQuery.data} />
                            )}
                        </TabsContent>

                        <TabsContent value="history" className="pt-4">
                            {historyQuery.isLoading && <Skeleton className="h-64" />}
                            {historyQuery.data && (
                                <HistoryView runs={historyQuery.data.runs} />
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </main>
    );
}

// ── Performance view ────────────────────────────────────────────────────────

function PerformanceView({ data }: { data: import("@/lib/api").SuggestionPerformance }) {
    const windows = ["30d", "60d", "90d", "180d"] as const;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Outcome tracking
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                        <Stat label="Total tracked" value={String(data.total_outcomes_tracked)} />
                        <Stat label="Open" value={String(data.open)} />
                        <Stat label="Acted" value={String(data.acted)} />
                        <Stat label="Passed" value={String(data.passed)} />
                        <Stat label="Expired" value={String(data.expired)} />
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                {windows.map((w) => {
                    const win = data.windows[w];
                    return (
                        <Card key={w}>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                                    {w} window
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {win.samples === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        Not enough mature suggestions yet.
                                    </p>
                                ) : (
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Samples</span>
                                            <span className="font-mono">{win.samples}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Avg system return</span>
                                            <span className={`font-mono ${colorForChange(win.avg_stock_return_pct)}`}>
                                                {pct(win.avg_stock_return_pct)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Avg NIFTY 100 EW return</span>
                                            <span className={`font-mono ${colorForChange(win.avg_nifty_return_pct)}`}>
                                                {pct(win.avg_nifty_return_pct)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-t pt-2">
                                            <span className="font-medium">Excess vs benchmark</span>
                                            <span className={`font-mono font-bold ${colorForChange(win.avg_excess_return_pct)}`}>
                                                {pct(win.avg_excess_return_pct)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Win rate (above benchmark)</span>
                                            <span className="font-mono">{pct(win.win_rate_pct, false)}</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <p className="text-xs italic text-muted-foreground">
                Benchmark = equal-weighted NIFTY 100 return over the same window.
                Excess return is the system&apos;s suggestion return minus that benchmark.
                Positive excess means the suggestion engine is adding value.
            </p>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md border bg-card p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-1 font-mono text-base">{value}</p>
        </div>
    );
}

// ── History view ────────────────────────────────────────────────────────────

function HistoryView({ runs }: { runs: import("@/lib/api").SuggestionRunSummary[] }) {
    if (runs.length === 0) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No past runs yet.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-0">
                <table className="w-full text-sm">
                    <thead className="border-b bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                            <th className="px-4 py-3 text-left">Run date</th>
                            <th className="px-4 py-3 text-left">Type</th>
                            <th className="px-4 py-3 text-right">Universe</th>
                            <th className="px-4 py-3 text-right">Eligible</th>
                            <th className="px-4 py-3 text-right">Top K</th>
                            <th className="px-4 py-3 text-left">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {runs.map((r) => (
                            <tr key={r._id} className="border-b last:border-0 hover:bg-muted/20">
                                <td className="px-4 py-3 font-mono text-xs">{dateTime(r.run_date)}</td>
                                <td className="px-4 py-3 text-xs">{r.run_type}</td>
                                <td className="px-4 py-3 text-right font-mono">{r.universe_size}</td>
                                <td className="px-4 py-3 text-right font-mono">{r.candidates_post_gates}</td>
                                <td className="px-4 py-3 text-right font-mono">{r.top_k}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-block rounded px-2 py-0.5 text-xs ${r.status === "success"
                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                        }`}>
                                        {r.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
}