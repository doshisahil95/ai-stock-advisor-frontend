"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, RefreshCw, AlertCircle, Play } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SuggestionCard } from "@/components/suggestion-card";
import { PageIntro } from "@/components/page-intro";
import { ChatPanel } from "@/components/chat-panel";
import { StockResearchPanel } from "@/components/stock-research-panel";
import {
    api,
    FeedbackAction,
    ApiError,
    BucketKey,
    SuggestionDirection,
    SuggestionPerformance,
    SuggestionRunSummary,
} from "@/lib/api";
import { dateTime, pct, colorForChange } from "@/lib/format";

const BUCKET_LABEL: Record<BucketKey, string> = {
    open: "Open",
    acted: "Acted",
    passed: "Passed",
    rejected: "Rejected",
    expired: "Expired",
};

export default function SuggestionsPage() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("latest");
    const [direction, setDirection] = useState<SuggestionDirection>("buy");
    // F6: feedback state is server-side. The /suggestions/latest response
    // stamps each candidate with user_action so the card renders collapsed.
    // After a mutation we refetch (await) so the toast lands AFTER the page
    // reflects the new state (PROJECT_STATE §14.4 convention).

    const latestQuery = useQuery({
        queryKey: ["suggestions", "latest", direction],
        queryFn: () => api.getLatestSuggestionRun(direction),
        retry: (failureCount, error) => {
            if (error instanceof ApiError && error.status === 404) return false;
            return failureCount < 2;
        },
    });

    const performanceQuery = useQuery({
        queryKey: ["suggestions", "performance", direction],
        queryFn: () => api.getSuggestionPerformance(direction),
        enabled: activeTab === "performance",
    });
    const historyQuery = useQuery({
        queryKey: ["suggestions", "history", direction],
        queryFn: () => api.listSuggestionRuns(20, 0, direction),
        enabled: activeTab === "history",
    });


    const feedbackMutation = useMutation({
        mutationFn: ({
            isin,
            action,
            note,
        }: {
            isin: string;
            action: FeedbackAction;
            note?: string;
        }) => api.submitFeedback(isin, { action, note }),
        onSuccess: async (_, vars) => {
            // Synchronous refetch so the user_action stamp lands BEFORE the
            // toast (PROJECT_STATE §14.4 — refetchQueries, not invalidateQueries).
            await Promise.all([
                queryClient.refetchQueries({ queryKey: ["suggestions", "latest", direction] }),
                queryClient.refetchQueries({ queryKey: ["suggestions", "performance", direction] }),
            ]);
            const verb =
                vars.action === "acted"
                    ? "Acted on"
                    : vars.action === "passed"
                        ? "Passed on"
                        : "Rejected";
            const description =
                vars.action === "rejected"
                    ? "Hidden from suggestions for 90 days."
                    : vars.action === "acted"
                        ? "Soft-excluded for 30 days while the trade settles. Tracking continues."
                        : "Will resurface next Sunday — market changes.";
            toast.success(`${verb} ${vars.isin}`, { description });
        },
        onError: (error) => {
            toast.error(`Feedback failed: ${error.message}`);
        },
    });

    const handleFeedback = (isin: string, action: FeedbackAction) => {
        feedbackMutation.mutate({ isin, action });
    };

    // #55-followup: manual "Run now". POST is fire-and-forget (202); the
    // pipeline runs on the server (~5 min). We then poll the run status and,
    // when it flips to not-running, refetch the latest run so fresh dossiers
    // (and #55 hold-horizons) appear. `running` is seeded by the POST and by
    // an initial status check on direction change, so a run kicked off in
    // another tab (or an overlapping Sunday cron) also shows as busy.
    const [running, setRunning] = useState(false);

    const runStatusQuery = useQuery({
        queryKey: ["suggestions", "run-status", direction],
        queryFn: () => api.getSuggestionRunStatus(direction),
        // Poll every 10s only while we believe a run is in flight.
        refetchInterval: running ? 10_000 : false,
    });

    // When the server-reported status transitions running -> idle, pull fresh
    // data and let the user know. Also syncs `running` if a run is discovered.
    useEffect(() => {
        const serverRunning = runStatusQuery.data?.running;
        if (serverRunning === undefined) return;
        if (serverRunning && !running) {
            setRunning(true);
            return;
        }
        if (!serverRunning && running) {
            setRunning(false);
            queryClient.refetchQueries({
                queryKey: ["suggestions", "latest", direction],
            });
            queryClient.refetchQueries({
                queryKey: ["suggestions", "history", direction],
            });
            toast.success(`Fresh ${direction} run ready`, {
                description: "New candidates and dossiers loaded.",
            });
        }
    }, [runStatusQuery.data?.running, running, direction, queryClient]);

    const runMutation = useMutation({
        mutationFn: () => api.triggerSuggestionRun(direction),
        onSuccess: (res) => {
            setRunning(true);
            runStatusQuery.refetch();
            toast.info(`${direction === "buy" ? "Buy" : "Sell"} run started`, {
                description: res.message,
            });
        },
        onError: (error) => {
            if (error instanceof ApiError && error.status === 409) {
                // A run is already in flight (this tab, another tab, or the cron).
                setRunning(true);
                runStatusQuery.refetch();
                toast.warning("A run is already in progress", {
                    description: "Waiting for it to finish.",
                });
                return;
            }
            toast.error(`Could not start run: ${error.message}`);
        },
    });

    const runNowButton = (
        <Button
            variant="default"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => runMutation.mutate()}
            disabled={running || runMutation.isPending}
        >
            {running ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
                <Play className="h-3.5 w-3.5" />
            )}
            {running ? "Running…" : "Run now"}
        </Button>
    );

    return (
        <main className="min-h-screen bg-background">
            <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 lg:px-8">
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

                {/* Header */}
                <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Weekly Suggestions
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {latestQuery.data
                                ? `Latest ${direction} run: ${latestQuery.data.run_date_ist} · Universe: ${latestQuery.data.universe_size} · Eligible: ${latestQuery.data.candidates_post_gates}`
                                : direction === "buy"
                                    ? "AI-ranked NIFTY 100 buy-side candidates with full dossiers."
                                    : "AI-ranked sell-side trim / book-profit candidates from current holdings."}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {latestQuery.data && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5"
                                onClick={() => latestQuery.refetch()}
                                disabled={latestQuery.isFetching}
                            >
                                <RefreshCw
                                    className={`h-3.5 w-3.5 ${latestQuery.isFetching ? "animate-spin" : ""}`}
                                />
                                Refresh
                            </Button>
                        )}
                        {/* #55-followup: manual mid-week run trigger. */}
                        {runNowButton}
                    </div>
                </header>

                {/* Empty state — no runs yet */}
                {latestQuery.error instanceof ApiError &&
                    latestQuery.error.status === 404 && (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
                                <p className="mt-3 text-sm text-muted-foreground">
                                    No suggestion runs available yet.
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Trigger a run below, or run{" "}
                                    <code className="rounded bg-muted px-1 py-0.5">
                                        scripts/run_weekly_suggestions.py
                                    </code>{" "}
                                    on the server.
                                </p>
                                <div className="mt-4 flex justify-center">
                                    {runNowButton}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                {/* Generic error */}
                {latestQuery.error &&
                    !(
                        latestQuery.error instanceof ApiError &&
                        latestQuery.error.status === 404
                    ) && (
                        <div className="mb-6 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                            <AlertCircle className="h-4 w-4" />
                            <span>
                                Could not load suggestions: {latestQuery.error.message}
                            </span>
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
                    <div className="space-y-4">
                        {/* Page intro (collapsible help) */}
                        <PageIntro data={latestQuery.data.page_intro} />

                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-4 py-3">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    Direction
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {direction === "buy"
                                        ? "Accumulation ideas outside your current holdings."
                                        : "Trim / book-profit ideas from your current holdings."}
                                </p>
                            </div>
                            <Tabs
                                value={direction}
                                onValueChange={(value) =>
                                    setDirection(value as SuggestionDirection)
                                }
                            >
                                <TabsList>
                                    <TabsTrigger value="buy">Buy</TabsTrigger>
                                    <TabsTrigger value="sell">Sell</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList>
                                <TabsTrigger value="latest">Latest Run</TabsTrigger>
                                <TabsTrigger value="performance">Performance</TabsTrigger>
                                <TabsTrigger value="history">History</TabsTrigger>
                            </TabsList>

                            <TabsContent value="latest" className="space-y-4 pt-4">
                                {(() => {
                                    const all = latestQuery.data.top_candidates;
                                    if (all.length === 0) {
                                        return (
                                            <Card>
                                                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                                                    {direction === "buy"
                                                        ? "No eligible buy-side candidates this week."
                                                        : "No eligible sell-side candidates this week."}
                                                </CardContent>
                                            </Card>
                                        );
                                    }

                                    // F6: every candidate is rendered. Ones the user has
                                    // actioned during this run come back from the API with
                                    // user_action set and the SuggestionCard renders a
                                    // collapsed badge row. The banner above the list fires
                                    // only when nothing is left to do.
                                    const allActioned = all.every((c) => c.user_action != null);
                                    return (
                                        <>
                                            {allActioned && (
                                                <Card className="border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20">
                                                    <CardContent className="py-3 text-sm">
                                                        <p className="font-medium">All caught up.</p>
                                                        <p className="mt-1 text-muted-foreground">
                                                            You&apos;ve given feedback on all {all.length}{" "}
                                                            suggestions in this run. New suggestions arrive
                                                            every Sunday.
                                                        </p>
                                                    </CardContent>
                                                </Card>
                                            )}
                                            {all.map((c) => {
                                                const dossier = latestQuery.data!.dossiers.find(
                                                    (d) => d.isin === c.isin,
                                                );
                                                return (
                                                    <SuggestionCard
                                                        key={c.isin}
                                                        candidate={c}
                                                        dossier={dossier}
                                                        feedbackMeta={latestQuery.data!.feedback_meta}
                                                        onFeedback={handleFeedback}
                                                        feedbackPending={feedbackMutation.isPending}
                                                    />
                                                );
                                            })}
                                        </>
                                    );
                                })()}
                            </TabsContent>

                            <TabsContent value="performance" className="pt-4">
                                {performanceQuery.isLoading && <Skeleton className="h-64" />}
                                {performanceQuery.data && (
                                    <PerformanceView data={performanceQuery.data} />
                                )}
                            </TabsContent>

                            <TabsContent value="history" className="pt-4">
                                {historyQuery.isLoading && <Skeleton className="h-64" />}
                                {historyQuery.data && <HistoryView runs={historyQuery.data.runs} />}
                            </TabsContent>
                        </Tabs>
                    </div>
                )}

                <div className="mt-6 space-y-4">
                    <ChatPanel
                        title="Ask about these suggestions"
                        description="Chat about this week's buy/sell candidates. Read-only on your portfolio; advisory only."
                        placeholder="e.g. Which buy candidate has the best risk/reward, and why?"
                        historyParams={{ scope: "suggestions" }}
                        send={(query, sentiment) =>
                            api.chatSuggestions({ query, sentiment_overlay: sentiment })
                        }
                    />
                    <StockResearchPanel />
                </div>
            </div>
        </main>
    );
}

// ── Performance view ──────────────────────────────────────────────────────

function PerformanceView({ data }: { data: SuggestionPerformance }) {
    const windows = ["30d", "60d", "90d", "180d"] as const;
    const buckets: BucketKey[] = ["acted", "passed", "rejected", "open", "expired"];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <BarChart3 className="h-4 w-4" />
                        Outcome tracking
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-6">
                        <Stat label="Total tracked" value={String(data.total_outcomes_tracked)} />
                        {buckets.map((b) => (
                            <Stat key={b} label={BUCKET_LABEL[b]} value={String(data[b])} />
                        ))}
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
                                            <span className="text-muted-foreground">
                                                Avg system return
                                            </span>
                                            <span
                                                className={`font-mono ${colorForChange(win.avg_stock_return_pct)}`}
                                            >
                                                {pct(win.avg_stock_return_pct)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                                Avg NIFTY 100 EW return
                                            </span>
                                            <span
                                                className={`font-mono ${colorForChange(win.avg_nifty_return_pct)}`}
                                            >
                                                {pct(win.avg_nifty_return_pct)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-t pt-2">
                                            <span className="font-medium">Excess vs benchmark</span>
                                            <span
                                                className={`font-mono font-bold ${colorForChange(win.avg_excess_return_pct)}`}
                                            >
                                                {pct(win.avg_excess_return_pct)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">
                                                Win rate (above benchmark)
                                            </span>
                                            <span className="font-mono">
                                                {pct(win.win_rate_pct, false)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* By-bucket breakdown */}
                                {win.by_bucket ? (
                                    <div className="mt-4 space-y-1.5 border-t pt-3">
                                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            By user action
                                        </p>
                                        <div className="overflow-hidden rounded-md ring-1 ring-foreground/10">
                                            <table className="w-full text-xs">
                                                <thead className="bg-muted/40 text-muted-foreground">
                                                    <tr>
                                                        <th className="px-2 py-1 text-left font-medium">
                                                            Bucket
                                                        </th>
                                                        <th className="px-2 py-1 text-right font-medium">
                                                            Samples
                                                        </th>
                                                        <th className="px-2 py-1 text-right font-medium">
                                                            Avg excess
                                                        </th>
                                                        <th className="px-2 py-1 text-right font-medium">
                                                            Win rate
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {buckets.map((b) => {
                                                        const row = win.by_bucket?.[b];
                                                        return (
                                                            <tr
                                                                key={b}
                                                                className="border-t border-foreground/10"
                                                            >
                                                                <td className="px-2 py-1">{BUCKET_LABEL[b]}</td>
                                                                <td className="px-2 py-1 text-right font-mono">
                                                                    {row?.samples ?? 0}
                                                                </td>
                                                                <td
                                                                    className={`px-2 py-1 text-right font-mono ${colorForChange(row?.avg_excess_return_pct)}`}
                                                                >
                                                                    {pct(row?.avg_excess_return_pct)}
                                                                </td>
                                                                <td className="px-2 py-1 text-right font-mono">
                                                                    {pct(row?.win_rate_pct, false)}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <p className="text-xs italic text-muted-foreground">
                Benchmark = equal-weighted NIFTY 100 return over the same window.
                Excess return is the system&apos;s suggestion return minus that
                benchmark. Positive excess means the suggestion engine is adding
                value. The bucket table breaks the same metrics by what you actually
                did with each suggestion.
            </p>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md ring-1 ring-foreground/10 bg-card p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {label}
            </p>
            <p className="mt-1 font-mono text-base">{value}</p>
        </div>
    );
}

// ── History view ─────────────────────────────────────────────────────────

function HistoryView({ runs }: { runs: SuggestionRunSummary[] }) {
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
                                <td className="px-4 py-3 font-mono text-xs">
                                    {dateTime(r.run_date)}
                                </td>
                                <td className="px-4 py-3 text-xs">{r.run_type}</td>
                                <td className="px-4 py-3 text-right font-mono">
                                    {r.universe_size}
                                </td>
                                <td className="px-4 py-3 text-right font-mono">
                                    {r.candidates_post_gates}
                                </td>
                                <td className="px-4 py-3 text-right font-mono">{r.top_k}</td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`inline-block rounded px-2 py-0.5 text-xs ${r.status === "success"
                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                            }`}
                                    >
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