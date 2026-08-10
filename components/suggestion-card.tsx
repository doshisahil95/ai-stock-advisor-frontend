"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Check, X, EyeOff, Eye, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    SuggestionCandidate,
    SuggestionDossier,
    FeedbackAction,
    FeedbackMeta,
    GateMeta,
    GroupMetaEntry,
    SignalMeta,
    ConfidenceMeta,
    UserAction,
} from "@/lib/api";
import { inr } from "@/lib/format";
import { ExplainPopover } from "@/components/explain-popover";
interface Props {
    candidate: SuggestionCandidate;
    dossier?: SuggestionDossier;
    feedbackMeta?: FeedbackMeta;
    onFeedback: (isin: string, action: FeedbackAction) => void;
    feedbackPending: boolean;
}

export function SuggestionCard({
    candidate,
    dossier,
    feedbackMeta,
    onFeedback,
    feedbackPending,
}: Props) {
    const [expanded, setExpanded] = useState(false);
    // F6: when the backend has stamped user_action (meaning the user already
    // acted/passed/rejected this candidate during the current run), default
    // to a collapsed badge row. "Show full card" promotes back to the normal
    // rendering so the user can change their mind or re-read the dossier.
    const userAction = candidate.user_action ?? null;
    const [forceShowFull, setForceShowFull] = useState(false);
    if (userAction && !forceShowFull) {
        return (
            <CollapsedFeedbackRow
                candidate={candidate}
                userAction={userAction}
                feedbackMeta={feedbackMeta}
                onShowFull={() => setForceShowFull(true)}
            />
        );
    }

    const compositeColor =
        candidate.composite_score >= 70
            ? "text-emerald-600 dark:text-emerald-500"
            : candidate.composite_score >= 55
                ? "text-amber-600 dark:text-amber-500"
                : "text-muted-foreground";

    const confidenceLabel =
        candidate.confidence_score >= 90
            ? "high"
            : candidate.confidence_score >= 70
                ? "med"
                : "low";

    const confidenceClass =
        candidate.confidence_score >= 90
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
            : candidate.confidence_score >= 70
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";

    const groupMeta = candidate.group_meta;
    const confMeta = candidate.confidence_meta;
    const pes = dossier?.plain_english_summary;
    const pesAvailable = pes && pes.length > 0 && !pes.startsWith("(");
    const showThesis =
        dossier?.one_line_thesis &&
        !dossier.narrative_unavailable &&
        !dossier.one_line_thesis.startsWith("(");
    const isSellSide = Boolean(groupMeta?.booking_opportunity);
    const showTaxConsideration =
        dossier?.tax_consideration &&
        dossier.tax_consideration.length > 0 &&
        !dossier.tax_consideration.startsWith("(");
    const showConcentrationNote =
        dossier?.concentration_note &&
        dossier.concentration_note.length > 0 &&
        !dossier.concentration_note.startsWith("(");
    // #55: LLM-authored hold-horizon (buy-side only). Bucket is always present
    // on a fresh buy dossier (defaults to "medium"); the three prose fields use
    // the standard "(...)" unavailable marker, so guard with !startsWith("(").
    const hasHorizon =
        !isSellSide &&
        Boolean(dossier?.hold_horizon) &&
        !dossier?.narrative_unavailable;
    const isAvail = (s?: string) =>
        Boolean(s && s.length > 0 && !s.startsWith("("));
    const showHorizonExpectedMove = hasHorizon && isAvail(dossier?.hold_horizon_expected_move);
    const showHorizonRationale = hasHorizon && isAvail(dossier?.hold_horizon_rationale);
    const showHorizonReviewTrigger = hasHorizon && isAvail(dossier?.hold_horizon_review_trigger);
    // #81: suggested stop-loss + target — both buy and sell. Advisory only.
    const showStopTarget =
        !dossier?.narrative_unavailable &&
        (isAvail(dossier?.suggested_target) ||
            isAvail(dossier?.suggested_stop) ||
            isAvail(dossier?.suggested_stop_target_rationale));

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-baseline gap-3">
                        <span className="font-mono text-sm text-muted-foreground">
                            #{candidate.rank}
                        </span>
                        <h2 className="text-lg font-semibold">{candidate.symbol}</h2>
                        <span className="text-sm text-muted-foreground">
                            {candidate.name || candidate.sector || ""}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`font-mono text-base font-bold ${compositeColor}`}>
                            {candidate.composite_score.toFixed(1)}
                        </span>
                        <span className="text-xs text-muted-foreground">/ 100</span>
                        <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${confidenceClass}`}
                        >
                            conf {candidate.confidence_score.toFixed(0)} · {confidenceLabel}
                            {confMeta ? (
                                <ConfidenceExplain meta={confMeta} score={candidate.confidence_score} />
                            ) : null}
                        </span>
                    </div>
                </div>

                {/* Per-group breakdown */}
                <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                    {isSellSide ? (
                        <>
                            {/* TD7/#45: sell group scores are now first-class
                                candidate fields (symmetric with the buy bars
                                below reading candidate.quality_score etc.).
                                Fall back to group_meta.score, then 0, so
                                historical pre-#45 sell runs still render. */}
                            <GroupBar
                                fallbackLabel="Booking Opportunity"
                                value={candidate.booking_opportunity_score ?? groupMeta?.booking_opportunity?.score ?? 0}
                                meta={groupMeta?.booking_opportunity}
                            />
                            <GroupBar
                                fallbackLabel="Valuation Stretch"
                                value={candidate.valuation_stretch_score ?? groupMeta?.valuation_stretch?.score ?? 0}
                                meta={groupMeta?.valuation_stretch}
                            />
                            <GroupBar
                                fallbackLabel="Risk"
                                value={candidate.risk_score ?? groupMeta?.risk?.score ?? 0}
                                meta={groupMeta?.risk}
                            />
                            <GroupBar
                                fallbackLabel="Tax & Concentration"
                                value={candidate.tax_concentration_score ?? groupMeta?.tax_concentration?.score ?? 0}
                                meta={groupMeta?.tax_concentration}
                            />
                        </>
                    ) : (
                        <>
                            <GroupBar
                                fallbackLabel="Quality"
                                value={candidate.quality_score}
                                meta={groupMeta?.quality}
                            />
                            <GroupBar
                                fallbackLabel="Valuation"
                                value={candidate.valuation_score}
                                meta={groupMeta?.valuation}
                            />
                            <GroupBar
                                fallbackLabel="Momentum"
                                value={candidate.momentum_score}
                                meta={groupMeta?.momentum}
                            />
                            <GroupBar
                                fallbackLabel="News"
                                value={candidate.news_score}
                                meta={groupMeta?.news}
                            />
                        </>
                    )}
                </div>

                {/* Plain-English summary (preferred over one-line thesis) */}
                {pesAvailable ? (
                    <div className="mt-3 rounded-md border border-blue-500/20 bg-blue-50/40 p-3 text-sm leading-relaxed dark:border-blue-400/20 dark:bg-blue-950/20">
                        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-blue-700 dark:text-blue-400">
                            What this means
                        </p>
                        <p>{pes}</p>
                    </div>
                ) : null}

                {/* One-line thesis (analyst tone, fallback) */}
                {showThesis ? (
                    <p className="mt-3 text-sm italic text-foreground/80">
                        {dossier!.one_line_thesis}
                    </p>
                ) : null}

                {/* #55: hold-horizon strip — visible without expanding so every
                    buy candidate carries a time frame + the gain that justifies
                    committing capital for that long. */}
                {hasHorizon ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-medium ${horizonBadgeClass(
                                dossier!.hold_horizon!
                            )}`}
                        >
                            <Clock className="h-3 w-3" />
                            {horizonLabel(dossier!.hold_horizon!)}
                        </span>
                        {showHorizonExpectedMove ? (
                            <span className="text-muted-foreground">
                                {dossier!.hold_horizon_expected_move}
                            </span>
                        ) : null}
                    </div>
                ) : null}
            </CardHeader>

            <CardContent className="pt-0">
                {/* Expand / actions row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpanded((v) => !v)}
                        className="-ml-2 h-8 gap-1.5"
                    >
                        {expanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                        )}
                        {expanded ? "Hide details" : "Show full dossier"}
                    </Button>
                    <div className="flex flex-wrap gap-1">
                        <FeedbackButton
                            icon={<Check className="h-3.5 w-3.5" />}
                            label={feedbackMeta?.acted.display_name ?? "Acted on this"}
                            meta={feedbackMeta?.acted}
                            onClick={() => onFeedback(candidate.isin, "acted")}
                            disabled={feedbackPending}
                        />
                        <FeedbackButton
                            icon={<X className="h-3.5 w-3.5" />}
                            label={feedbackMeta?.passed.display_name ?? "Passed"}
                            meta={feedbackMeta?.passed}
                            onClick={() => onFeedback(candidate.isin, "passed")}
                            disabled={feedbackPending}
                        />
                        <FeedbackButton
                            icon={<EyeOff className="h-3.5 w-3.5" />}
                            label={feedbackMeta?.rejected.display_name ?? "Not interested (90d)"}
                            meta={feedbackMeta?.rejected}
                            onClick={() => onFeedback(candidate.isin, "rejected")}
                            disabled={feedbackPending}
                            muted
                        />
                    </div>
                </div>

                {expanded && (
                    <div className="mt-4 space-y-4">
                        <Separator />

                        {/* Dossier */}
                        {dossier && !dossier.narrative_unavailable ? (
                            <div className="space-y-4">
                                <DossierSection
                                    label="Bull case"
                                    items={dossier.bull_case}
                                    tone="positive"
                                />
                                <DossierSection
                                    label="Bear case"
                                    items={dossier.bear_case}
                                    tone="negative"
                                />
                                <DossierSection
                                    label="Key risks"
                                    items={dossier.key_risks}
                                    tone="neutral"
                                />
                                <Section label="Valuation verdict">
                                    <p className="text-sm capitalize">{dossier.valuation_verdict}</p>
                                    {/* #44 (TD3): show the rationale beneath the label when present
                                        (isAvail hides the "(insufficient data)" / "(unavailable)" markers). */}
                                    {isAvail(dossier.valuation_rationale) && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {dossier.valuation_rationale}
                                        </p>
                                    )}
                                </Section>
                                {showTaxConsideration ? (
                                    <Section label="Tax consideration">
                                        <p className="text-sm">{dossier.tax_consideration}</p>
                                    </Section>
                                ) : null}
                                {showConcentrationNote ? (
                                    <Section label="Concentration note">
                                        <p className="text-sm">{dossier.concentration_note}</p>
                                    </Section>
                                ) : dossier.portfolio_fit ? (
                                    <Section label="Portfolio fit">
                                        <p className="text-sm">{dossier.portfolio_fit}</p>
                                    </Section>
                                ) : null}
                                {/* #55: hold-horizon detail (buy-side). */}
                                {hasHorizon ? (
                                    <Section label="Expected hold horizon">
                                        <div className="space-y-2 text-sm">
                                            <p className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${horizonBadgeClass(
                                                        dossier.hold_horizon!
                                                    )}`}
                                                >
                                                    <Clock className="h-3 w-3" />
                                                    {horizonLabel(dossier.hold_horizon!)}
                                                </span>
                                            </p>
                                            {showHorizonExpectedMove ? (
                                                <p>
                                                    <span className="font-medium">Why the wait pays: </span>
                                                    {dossier.hold_horizon_expected_move}
                                                </p>
                                            ) : null}
                                            {showHorizonRationale ? (
                                                <p>
                                                    <span className="font-medium">Rationale: </span>
                                                    {dossier.hold_horizon_rationale}
                                                </p>
                                            ) : null}
                                            {showHorizonReviewTrigger ? (
                                                <p>
                                                    <span className="font-medium">Re-check early if: </span>
                                                    {dossier.hold_horizon_review_trigger}
                                                </p>
                                            ) : null}
                                        </div>
                                    </Section>
                                ) : null}
                                {/* #81: LLM-authored suggested stop-loss + target (both buy and sell).
                                    Advisory reference points only — the system never trades.
                                    Hidden when all three fields are absent or start with "(" (unavailable). */}
                                {showStopTarget ? (
                                    <Section label="Suggested reference levels">
                                        <p className="mb-2 text-xs italic text-muted-foreground">
                                            Analytical reference points only — not trade instructions. The system never executes orders.
                                        </p>
                                        <div className="space-y-2 text-sm">
                                            {isAvail(dossier?.suggested_target) ? (
                                                <p>
                                                    <span className="font-medium text-emerald-700 dark:text-emerald-400">Upside target: </span>
                                                    {dossier!.suggested_target}
                                                </p>
                                            ) : null}
                                            {isAvail(dossier?.suggested_stop) ? (
                                                <p>
                                                    <span className="font-medium text-red-700 dark:text-red-400">Stop / exit trigger: </span>
                                                    {dossier!.suggested_stop}
                                                </p>
                                            ) : null}
                                            {isAvail(dossier?.suggested_stop_target_rationale) ? (
                                                <p className="text-xs text-muted-foreground">
                                                    <span className="font-medium">Why: </span>
                                                    {dossier!.suggested_stop_target_rationale}
                                                </p>
                                            ) : null}
                                        </div>
                                    </Section>
                                ) : null}
                            </div>
                        ) : (
                            <p className="text-sm italic text-muted-foreground">
                                Dossier narrative unavailable
                                {dossier?.narrative_unavailable_reason &&
                                    ` (${dossier.narrative_unavailable_reason})`}
                                . Signal data below is still trustworthy.
                            </p>
                        )}

                        <Separator />

                        {/* Confidence deductions */}
                        {candidate.confidence_deductions.length > 0 && (
                            <Section label="Confidence deductions">
                                <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                                    {candidate.confidence_deductions.map((d, i) => (
                                        <li key={i}>{d}</li>
                                    ))}
                                </ul>
                            </Section>
                        )}

                        {/* Quality gates — prefer gate_meta when present */}
                        <Section label="Quality gates">
                            {candidate.gate_meta?.length ? (
                                <div className="space-y-1.5">
                                    {candidate.gate_meta.map((g) => (
                                        <GateRow key={g.gate_name} g={g} />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {candidate.gates.map((g) => (
                                        <div
                                            key={g.gate_name}
                                            className="flex items-center gap-2 text-xs"
                                        >
                                            <span
                                                className={
                                                    g.skipped
                                                        ? "text-muted-foreground"
                                                        : g.passed
                                                            ? "text-emerald-600 dark:text-emerald-500"
                                                            : "text-red-600 dark:text-red-500"
                                                }
                                            >
                                                {g.skipped ? "⊘" : g.passed ? "✓" : "✗"}
                                            </span>
                                            <span className="font-mono">{g.gate_name}:</span>
                                            <span className="text-muted-foreground">
                                                {g.skipped
                                                    ? g.skip_reason
                                                    : `${g.threshold} | ${g.actual_value}`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Section>

                        {/* Signals — only when signal_meta present */}
                        {candidate.signal_meta?.length ? (
                            <Section label="Signals">
                                <div className="overflow-hidden rounded-md ring-1 ring-foreground/10">
                                    <table className="w-full text-xs">
                                        <thead className="bg-muted/40 text-muted-foreground">
                                            <tr>
                                                <th className="px-2.5 py-1.5 text-left font-medium">
                                                    Signal
                                                </th>
                                                <th className="px-2.5 py-1.5 text-right font-medium">
                                                    Value
                                                </th>
                                                <th className="px-2.5 py-1.5 text-right font-medium">
                                                    Score
                                                </th>
                                                <th className="px-2.5 py-1.5 text-right font-medium">
                                                    Group
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {candidate.signal_meta.map((s) => (
                                                <SignalRow key={s.signal_name} s={s} />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Section>
                        ) : null}

                        {/* Price context */}
                        <Section label="Price">
                            <p className="font-mono text-sm">
                                {inr(candidate.current_price)} as of{" "}
                                {candidate.price_as_of?.slice(0, 10) ?? "—"}
                            </p>
                        </Section>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ── Subcomponents ──────────────────────────────────────────────────────────

// F6: compact one-row representation for candidates the user has already
// given feedback on during the current run. Click "Show full card" to
// promote back to the standard SuggestionCard rendering.
function CollapsedFeedbackRow({
    candidate,
    userAction,
    feedbackMeta,
    onShowFull,
}: {
    candidate: SuggestionCandidate;
    userAction: UserAction;
    feedbackMeta?: FeedbackMeta;
    onShowFull: () => void;
}) {
    const badge = badgeStyleFor(userAction.action);
    const BadgeIcon = badge.Icon;
    const fallbackLabel =
        feedbackMeta?.[userAction.action]?.display_name ?? badge.text;
    return (
        <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 flex-wrap items-baseline gap-3">
                    <span className="font-mono text-sm text-muted-foreground">
                        #{candidate.rank}
                    </span>
                    <span className="font-semibold">{candidate.symbol}</span>
                    <span className="truncate text-sm text-muted-foreground">
                        {candidate.name || candidate.sector || ""}
                    </span>
                    <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${badge.className}`}
                    >
                        <BadgeIcon className="h-3 w-3" />
                        {fallbackLabel}
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={onShowFull}
                >
                    <Eye className="h-3.5 w-3.5" />
                    Show full card
                </Button>
            </CardContent>
        </Card>
    );
}

function badgeStyleFor(action: FeedbackAction): {
    className: string;
    Icon: typeof Check;
    text: string;
} {
    if (action === "acted") {
        return {
            className:
                "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
            Icon: Check,
            text: "Acted",
        };
    }
    if (action === "passed") {
        return {
            className:
                "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
            Icon: X,
            text: "Passed",
        };
    }
    return {
        className: "bg-muted text-muted-foreground",
        Icon: EyeOff,
        text: "Rejected (90d)",
    };
}

function GroupBar({
    fallbackLabel,
    value,
    meta,
}: {
    fallbackLabel: string;
    value: number;
    meta?: GroupMetaEntry;
}) {
    const display = meta?.display_name ?? fallbackLabel;
    const score = meta?.score ?? value;
    const fillColor =
        score >= 70
            ? "bg-emerald-500"
            : score >= 50
                ? "bg-blue-500"
                : score >= 30
                    ? "bg-amber-500"
                    : "bg-red-500";

    return (
        <div>
            <div className="flex items-baseline justify-between">
                <span className="flex items-center gap-1 text-muted-foreground">
                    {display}
                    {meta ? (
                        <ExplainPopover
                            title={`${display} (${meta.weight_pct} of composite)`}
                            ariaLabel={`Explain ${display}`}
                        >
                            <p>{meta.what_it_measures}</p>
                            <p>
                                <span className="font-medium text-foreground">
                                    This candidate ({Math.round(score)}/100):
                                </span>{" "}
                                {meta.this_candidate_interpretation}
                            </p>
                        </ExplainPopover>
                    ) : null}
                </span>
                <span className="font-mono">{score.toFixed(0)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                    className={`h-full ${fillColor}`}
                    style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                />
            </div>
        </div>
    );
}

function ConfidenceExplain({
    meta,
    score,
}: {
    meta: ConfidenceMeta;
    score: number;
}) {
    return (
        <ExplainPopover
            title={`Confidence ${score.toFixed(0)}/100`}
            ariaLabel="Explain confidence"
        >
            <p>{meta.what_it_means}</p>
            <p>
                <span className="font-medium text-foreground">This candidate:</span>{" "}
                {meta.this_candidate_interpretation}
            </p>
            {meta.deductions.length > 0 ? (
                <div>
                    <p className="font-medium text-foreground">Active deductions:</p>
                    <ul className="ml-4 list-disc">
                        {meta.deductions.map((d, i) => (
                            <li key={i}>{d}</li>
                        ))}
                    </ul>
                </div>
            ) : (
                <p className="italic">No deductions — all signals fresh and complete.</p>
            )}
        </ExplainPopover>
    );
}

function GateRow({ g }: { g: GateMeta }) {
    const sigil = g.skipped ? "⊘" : g.passed ? "✓" : "✗";
    const color = g.skipped
        ? "text-muted-foreground"
        : g.passed
            ? "text-emerald-600 dark:text-emerald-500"
            : "text-red-600 dark:text-red-500";
    return (
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md ring-1 ring-foreground/10 px-2.5 py-1.5 text-xs">
            <span className={`font-bold ${color}`}>{sigil}</span>
            <span className="flex items-center gap-1.5">
                <span className="font-medium">{g.display_name}</span>
                <ExplainPopover
                    title={g.display_name}
                    ariaLabel={`Why ${g.display_name}`}
                >
                    <p>{g.why_we_check}</p>
                    <p>
                        <span className="font-medium text-foreground">Result:</span>{" "}
                        {g.plain_english}
                    </p>
                </ExplainPopover>
            </span>
            <span className="font-mono text-muted-foreground">
                {g.skipped ? g.skip_reason : `${g.threshold} | ${g.actual_value}`}
            </span>
        </div>
    );
}

function SignalRow({ s }: { s: SignalMeta }) {
    return (
        <tr
            className={`border-t border-foreground/10 ${!s.available ? "opacity-50" : ""}`}
        >
            <td className="px-2.5 py-1.5">
                <span className="flex items-center gap-1.5">
                    <span className="font-medium">{s.display_name}</span>
                    <ExplainPopover
                        title={s.display_name}
                        ariaLabel={`Explain ${s.display_name}`}
                    >
                        <p>{s.short_description}</p>
                        <p>{s.what_higher_means}</p>
                    </ExplainPopover>
                </span>
            </td>
            <td className="px-2.5 py-1.5 text-right font-mono">
                {s.raw_value_formatted}
            </td>
            <td className="px-2.5 py-1.5 text-right font-mono text-muted-foreground">
                {s.available ? Math.round(s.normalized_score) : "—"}
            </td>
            <td className="px-2.5 py-1.5 text-right capitalize text-muted-foreground">
                {s.group}
            </td>
        </tr>
    );
}

function FeedbackButton({
    icon,
    label,
    meta,
    onClick,
    disabled,
    muted,
}: {
    icon: React.ReactNode;
    label: string;
    meta?: { display_name: string; what_it_does: string; side_effects: string };
    onClick: () => void;
    disabled: boolean;
    muted?: boolean;
}) {
    return (
        <span className="inline-flex items-center gap-1">
            <Button
                variant="outline"
                size="sm"
                className={`h-8 gap-1.5 ${muted ? "text-muted-foreground" : ""}`}
                onClick={onClick}
                disabled={disabled}
            >
                {icon}
                {label}
            </Button>
            {meta ? (
                <ExplainPopover title={meta.display_name} ariaLabel={`Explain ${label}`}>
                    <p>
                        <span className="font-medium text-foreground">What it does:</span>{" "}
                        {meta.what_it_does}
                    </p>
                    <p>
                        <span className="font-medium text-foreground">Side effects:</span>{" "}
                        {meta.side_effects}
                    </p>
                </ExplainPopover>
            ) : null}
        </span>
    );
}

// #55: hold-horizon presentation helpers. Bucket -> human label + color.
function horizonLabel(bucket: "short" | "medium" | "long"): string {
    if (bucket === "short") return "Short horizon · ~1–3 months";
    if (bucket === "long") return "Long horizon · 12 months+";
    return "Medium horizon · ~3–12 months";
}

function horizonBadgeClass(bucket: "short" | "medium" | "long"): string {
    if (bucket === "short") {
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
    }
    if (bucket === "long") {
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
    }
    return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
}

function Section({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {label}
            </h3>
            {children}
        </div>
    );
}

function DossierSection({
    label,
    items,
    tone,
}: {
    label: string;
    items: string[];
    tone: "positive" | "negative" | "neutral";
}) {
    const accentClass =
        tone === "positive"
            ? "border-l-emerald-500"
            : tone === "negative"
                ? "border-l-red-500"
                : "border-l-amber-500";
    return (
        <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {label}
            </h3>
            <ul className="space-y-2">
                {items.map((item, i) => (
                    <li key={i} className={`border-l-2 pl-3 text-sm ${accentClass}`}>
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}