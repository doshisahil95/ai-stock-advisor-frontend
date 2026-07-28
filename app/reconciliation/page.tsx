"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Coins,
    HelpCircle,
    Newspaper,
} from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DividendAnnouncementDrift, DividendDriftRow } from "@/lib/api";
import { api, ApiError } from "@/lib/api";
import { colorForChange, dateShort, dateTime, inr, inrSigned } from "@/lib/format";

const formSchema = z.object({
    icici_invested: z.coerce.number().positive("Must be positive"),
    icici_current_value: z.coerce.number().positive("Must be positive"),
    icici_day_gain: z.coerce.number().optional(),
    notes: z.string().max(500).optional(),
    set_as_baseline: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export default function ReconciliationPage() {
    const queryClient = useQueryClient();

    const latestQuery = useQuery({
        queryKey: ["reconciliation", "latest", "manual"],
        queryFn: () => api.getLatestReconciliation("manual"),
    });

    const historyQuery = useQuery({
        queryKey: ["reconciliation", "history"],
        queryFn: () => api.getReconciliationHistory(30),
    });

    const dividendDriftQuery = useQuery({
        queryKey: ["reconciliation", "dividend-drift"],
        queryFn: () => api.getDividendDrift(),
    });

    const submitMutation = useMutation({
        mutationFn: (values: FormValues) =>
            api.postReconciliationSnapshot({
                icici_invested: values.icici_invested,
                icici_current_value: values.icici_current_value,
                icici_day_gain: values.icici_day_gain,
                notes: values.notes || undefined,
                set_as_baseline: values.set_as_baseline,
            }),
        onSuccess: async (snap) => {
            // #78 U7-b: synchronous refetch BEFORE the toast (app-wide §14.4
            // convention). The lazy invalidateQueries used here could paint the
            // prior snapshot for a frame; refetchQueries + await guarantees the
            // status/history reflect the new snapshot when the toast fires.
            await queryClient.refetchQueries({ queryKey: ["reconciliation"] });
            if (snap.has_drift) {
                toast.warning("Snapshot recorded — drift detected", {
                    description: "Alerts have been sent.",
                });
            } else {
                toast.success("Snapshot recorded — no drift");
            }
            form.reset();
        },
        onError: (err: Error) => {
            const message = err instanceof ApiError ? err.detail : err.message;
            toast.error("Failed to record snapshot", { description: message });
        },
    });

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            set_as_baseline: false,
        },
    });

    return (
        <main className="min-h-screen bg-background">
            <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 lg:px-8">
                {/* Header */}
                <header className="mb-6 space-y-2">
                    <Link href="/" className="inline-flex">
                        <Button variant="ghost" size="sm" className="-ml-3 h-8 gap-2 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back to portfolio
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Reconciliation</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Compare your portfolio with the broker. Detect drift before tax season.
                        </p>
                    </div>
                </header>
                <Card className="mb-6 border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Why reconciliation?</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pb-4 text-sm text-muted-foreground">
                        <p>
                            Our portfolio is computed from your ICICI Order Book trades plus any manual
                            corporate actions (splits, bonuses, demergers) we&apos;ve recorded. ICICI&apos;s
                            portfolio screen does the same — but the two views can diverge in legitimate
                            ways (e.g. different cost-basis treatment after a demerger) or in problematic
                            ways (we missed a corporate action they didn&apos;t).
                        </p>
                        <p>
                            <strong className="text-foreground">How to use this page:</strong> open
                            ICICI&apos;s portfolio screen periodically (e.g. weekly), enter the three numbers
                            shown below, and click <em>Record snapshot</em>. The system stores it and
                            compares with previous snapshots. If drift exceeds the alert threshold
                            (₹1,000 on Invested, ₹15,000 on Current Value), you&apos;ll get a push
                            notification and email — usually meaning a corporate action is unaccounted for
                            and worth investigating before tax season.
                        </p>
                        <p>
                            <strong className="text-foreground">Baseline:</strong> some delta is intentional
                            (e.g. our Invested is ₹24,244 lower because we use the post-demerger Section
                            49(2C) cost basis split for TMPV/TMCV, while ICICI shows the pre-demerger
                            number). When you confirm such a difference is expected, tick &ldquo;Save current
                            delta as the new baseline&rdquo; — future snapshots only alert on drift{" "}
                            <em>beyond</em> this baseline.
                        </p>
                    </CardContent>
                </Card>

                {/* Status card */}
                <StatusCard snapshot={latestQuery.data} loading={latestQuery.isLoading} />

                {/* Dividend drift (#65) */}
                <DividendDriftCard
                    rows={dividendDriftQuery.data}
                    loading={dividendDriftQuery.isLoading}
                />

                {/* New snapshot form */}
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Record a new snapshot</CardTitle>
                        <CardDescription>
                            Open ICICI&apos;s portfolio screen and copy the three values into the form below.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={form.handleSubmit((v) => submitMutation.mutate(v))}
                            className="space-y-4"
                        >
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="icici_invested">ICICI Invested (₹)</Label>
                                    <Input
                                        id="icici_invested"
                                        type="number"
                                        step="0.01"
                                        placeholder="1172328.72"
                                        {...form.register("icici_invested")}
                                    />
                                    {form.formState.errors.icici_invested && (
                                        <p className="text-xs text-red-600">
                                            {form.formState.errors.icici_invested.message}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="icici_current_value">ICICI Current Value (₹)</Label>
                                    <Input
                                        id="icici_current_value"
                                        type="number"
                                        step="0.01"
                                        placeholder="1127323.57"
                                        {...form.register("icici_current_value")}
                                    />
                                    {form.formState.errors.icici_current_value && (
                                        <p className="text-xs text-red-600">
                                            {form.formState.errors.icici_current_value.message}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="icici_day_gain">ICICI Day Gain (₹, optional)</Label>
                                    <Input
                                        id="icici_day_gain"
                                        type="number"
                                        step="0.01"
                                        placeholder="-13059.04"
                                        {...form.register("icici_day_gain")}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="notes">Notes (optional)</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="e.g. After verifying TATASTEEL split applied"
                                    rows={2}
                                    {...form.register("notes")}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    id="set_as_baseline"
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-input"
                                    {...form.register("set_as_baseline")}
                                />
                                <Label
                                    htmlFor="set_as_baseline"
                                    className="cursor-pointer text-sm font-normal"
                                >
                                    Save current delta as the new baseline (use after explaining a known mismatch)
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                disabled={submitMutation.isPending}
                                className="w-full md:w-auto"
                            >
                                {submitMutation.isPending ? "Recording…" : "Record snapshot"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* History */}
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>History</CardTitle>
                        <CardDescription>
                            Last 30 snapshots, newest first. Auto = daily cron, Manual = entered by you.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {historyQuery.isLoading && (
                            <div className="space-y-2">
                                {[0, 1, 2].map((i) => (
                                    <Skeleton key={i} className="h-10 w-full" />
                                ))}
                            </div>
                        )}
                        {historyQuery.data && historyQuery.data.length === 0 && (
                            <p className="text-sm text-muted-foreground">No snapshots yet.</p>
                        )}
                        {historyQuery.data && historyQuery.data.length > 0 && (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-xs uppercase tracking-wider">When</TableHead>
                                            <TableHead className="text-xs uppercase tracking-wider">Type</TableHead>
                                            <TableHead className="text-right text-xs uppercase tracking-wider">Our Inv.</TableHead>
                                            <TableHead className="text-right text-xs uppercase tracking-wider">ICICI Inv.</TableHead>
                                            <TableHead className="text-right text-xs uppercase tracking-wider">Δ Invested</TableHead>
                                            <TableHead className="text-right text-xs uppercase tracking-wider">Δ Current</TableHead>
                                            <TableHead className="text-xs uppercase tracking-wider">Drift?</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {historyQuery.data.map((s) => (
                                            <TableRow key={s._id} className="hover:bg-accent/40">
                                                <TableCell className="font-mono text-xs">
                                                    {dateTime(s.taken_at)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs">
                                                        {s.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                    {inr(s.our_invested)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                    {s.icici_invested ? inr(s.icici_invested) : "—"}
                                                </TableCell>
                                                <TableCell
                                                    className={`text-right font-mono text-xs ${colorForChange(s.delta_invested)}`}
                                                >
                                                    {s.delta_invested ? inrSigned(s.delta_invested) : "—"}
                                                </TableCell>
                                                <TableCell
                                                    className={`text-right font-mono text-xs ${colorForChange(s.delta_current_value)}`}
                                                >
                                                    {s.delta_current_value ? inrSigned(s.delta_current_value) : "—"}
                                                </TableCell>
                                                <TableCell>
                                                    {s.has_drift ? (
                                                        <Badge variant="destructive" className="gap-1 text-xs">
                                                            <AlertTriangle className="h-3 w-3" />
                                                            drift
                                                        </Badge>
                                                    ) : (
                                                        s.type === "manual" && (
                                                            <Badge
                                                                variant="outline"
                                                                className="gap-1 border-emerald-300 text-xs text-emerald-700 dark:border-emerald-900 dark:text-emerald-400"
                                                            >
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                ok
                                                            </Badge>
                                                        )
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}

interface StatusCardProps {
    snapshot: Awaited<ReturnType<typeof api.getLatestReconciliation>> | undefined;
    loading: boolean;
}

function StatusCard({ snapshot, loading }: StatusCardProps) {
    if (loading) return <Skeleton className="h-32" />;

    if (!snapshot) {
        return (
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
                <CardContent className="flex items-center gap-3 py-4">
                    <HelpCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <div>
                        <p className="font-medium text-amber-900 dark:text-amber-200">
                            No baseline recorded yet
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                            Record your first snapshot below to establish the expected delta.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const Icon = snapshot.has_drift ? AlertCircle : CheckCircle2;
    const colorClass = snapshot.has_drift
        ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
        : "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30";
    const iconColor = snapshot.has_drift
        ? "text-red-600 dark:text-red-400"
        : "text-emerald-600 dark:text-emerald-400";

    return (
        <Card className={colorClass}>
            <CardContent className="py-4">
                <div className="flex items-start gap-3">
                    <Icon className={`mt-0.5 h-5 w-5 ${iconColor}`} />
                    <div className="flex-1 space-y-3">
                        <div>
                            <p className="font-medium">
                                {snapshot.has_drift
                                    ? "Drift detected on latest snapshot"
                                    : "Latest snapshot matches expected baseline"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Recorded {dateTime(snapshot.taken_at)}
                            </p>
                        </div>
                        <div className="grid gap-3 text-sm sm:grid-cols-2">
                            <DeltaRow
                                label="Δ Invested"
                                value={snapshot.delta_invested}
                                drift={snapshot.drift_invested}
                            />
                            <DeltaRow
                                label="Δ Current Value"
                                value={snapshot.delta_current_value}
                                drift={snapshot.drift_current_value}
                            />
                        </div>
                        {snapshot.notes && (
                            <p className="text-xs italic text-muted-foreground">
                                &ldquo;{snapshot.notes}&rdquo;
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function DeltaRow({
    label,
    value,
    drift,
}: {
    label: string;
    value: string | null | undefined;
    drift: string | null | undefined;
}) {
    return (
        <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div className="flex items-center gap-3">
                <span className={`font-mono text-sm ${colorForChange(value)}`}>
                    {value ? inrSigned(value) : "—"}
                </span>
                {/* #78 U7-c: the backend already computes `drift` against the
                    per-field thresholds (₹1,000 Invested / ₹15,000 Current
                    Value), so a flat client-side `> 1000` disagreed with the CV
                    threshold AND was sign-blind (never badged a negative drift).
                    Trust the backend value; badge on any non-zero magnitude. */}
                {drift && Math.abs(parseFloat(drift)) > 0 && (
                    <Badge variant="destructive" className="text-xs">
                        drift {inrSigned(drift)}
                    </Badge>
                )}
            </div>
        </div>
    );
}

function statusBadge(status: DividendAnnouncementDrift["status"]) {
    if (status === "missing_receipt") {
        return (
            <Badge variant="destructive" className="gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                not recorded
            </Badge>
        );
    }
    if (status === "matched") {
        return (
            <Badge
                variant="outline"
                className="gap-1 border-emerald-300 text-xs text-emerald-700 dark:border-emerald-900 dark:text-emerald-400"
            >
                <CheckCircle2 className="h-3 w-3" />
                recorded
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="text-xs text-muted-foreground">
            pending
        </Badge>
    );
}

function DividendDriftCard({
    rows,
    loading,
}: {
    rows: DividendDriftRow[] | undefined;
    loading: boolean;
}) {
    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-muted-foreground" />
                    Dividend drift
                </CardTitle>
                <CardDescription>
                    Announced (from market data) vs recorded (your DIVIDEND entries). A
                    dividend is real money earned even though it isn&apos;t a capital gain —
                    an unrecorded payout understates your realised gain. Record any{" "}
                    <span className="font-medium text-foreground">not recorded</span> row as a
                    DIVIDEND transaction. This is not a tax view.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading && (
                    <div className="space-y-2">
                        {[0, 1, 2].map((i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                )}

                {rows && rows.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        No holdings to check.
                    </p>
                )}

                {rows && rows.length > 0 && <DividendDriftBody rows={rows} />}
            </CardContent>
        </Card>
    );
}

function DividendDriftBody({ rows }: { rows: DividendDriftRow[] }) {
    // Names with announcements first, and within that, missing-receipt names first.
    const withAnnouncements = rows
        .filter((r) => r.announcements.length > 0)
        .sort((a, b) => b.missing_count - a.missing_count);
    const totalMissing = rows.reduce((n, r) => n + r.missing_count, 0);

    if (withAnnouncements.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                No dividend announcements captured yet for your holdings. They are
                refreshed weekly from market data.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {totalMissing > 0 ? (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                        {totalMissing} announced dividend{totalMissing === 1 ? "" : "s"}{" "}
                        across your holdings {totalMissing === 1 ? "is" : "are"} not yet
                        recorded. Recording them keeps your realised gain accurate.
                    </span>
                </div>
            ) : (
                <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>All captured dividend announcements are recorded.</span>
                </div>
            )}

            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Newspaper className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                next to a stock means a recent corporate-action news item was found for
                it (corroborates the announced dividend).
            </p>

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-xs uppercase tracking-wider">
                                Stock
                            </TableHead>
                            <TableHead className="text-xs uppercase tracking-wider">
                                Ex-date
                            </TableHead>
                            <TableHead className="text-right text-xs uppercase tracking-wider">
                                Per share
                            </TableHead>
                            <TableHead className="text-right text-xs uppercase tracking-wider">
                                Est. received
                            </TableHead>
                            <TableHead className="text-xs uppercase tracking-wider">
                                Status
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {withAnnouncements.flatMap((row) =>
                            row.announcements
                                // newest ex-date first
                                .slice()
                                .sort((a, b) => b.ex_date.localeCompare(a.ex_date))
                                .map((a, idx) => (
                                    <TableRow
                                        key={`${row.isin}-${a.ex_date}`}
                                        className="hover:bg-accent/40"
                                    >
                                        <TableCell className="align-top">
                                            {idx === 0 ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">
                                                        {row.symbol}
                                                    </span>
                                                    {row.has_corporate_action_news && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className="inline-flex cursor-help items-center text-sky-600 dark:text-sky-400">
                                                                    <Newspaper className="h-3.5 w-3.5" />
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p className="max-w-xs text-xs">
                                                                    A recent corporate-action news
                                                                    item was found for {row.symbol},
                                                                    corroborating an announced
                                                                    dividend or other corporate
                                                                    action.
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">
                                                    ·
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {dateShort(a.ex_date, "with-year")}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            {inr(a.amount_per_share)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            {inr(a.expected_amount)}
                                        </TableCell>
                                        <TableCell>{statusBadge(a.status)}</TableCell>
                                    </TableRow>
                                ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}