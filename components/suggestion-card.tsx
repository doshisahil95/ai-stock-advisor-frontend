"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Check, X, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SuggestionCandidate, SuggestionDossier, FeedbackAction } from "@/lib/api";
import { inr } from "@/lib/format";

interface Props {
    candidate: SuggestionCandidate;
    dossier?: SuggestionDossier;
    onFeedback: (isin: string, action: FeedbackAction) => void;
    feedbackPending: boolean;
}

export function SuggestionCard({ candidate, dossier, onFeedback, feedbackPending }: Props) {
    const [expanded, setExpanded] = useState(false);

    const compositeColor =
        candidate.composite_score >= 70 ? "text-emerald-600 dark:text-emerald-500"
            : candidate.composite_score >= 55 ? "text-amber-600 dark:text-amber-500"
                : "text-muted-foreground";

    const confidenceLabel =
        candidate.confidence_score >= 90 ? "high"
            : candidate.confidence_score >= 70 ? "med"
                : "low";

    const confidenceClass =
        candidate.confidence_score >= 90 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
            : candidate.confidence_score >= 70 ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-baseline gap-3">
                        <span className="font-mono text-sm text-muted-foreground">#{candidate.rank}</span>
                        <h2 className="text-lg font-semibold">{candidate.symbol}</h2>
                        <span className="text-sm text-muted-foreground">
                            {candidate.name || candidate.sector || "—"}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`font-mono text-base font-bold ${compositeColor}`}>
                            {candidate.composite_score.toFixed(1)}
                        </span>
                        <span className="text-xs text-muted-foreground">/ 100</span>
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${confidenceClass}`}>
                            conf {candidate.confidence_score.toFixed(0)} · {confidenceLabel}
                        </span>
                    </div>
                </div>

                {/* Per-group breakdown */}
                <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                    <GroupBar label="Quality" value={candidate.quality_score} />
                    <GroupBar label="Valuation" value={candidate.valuation_score} />
                    <GroupBar label="Momentum" value={candidate.momentum_score} />
                    <GroupBar label="News" value={candidate.news_score} />
                </div>

                {/* Thesis */}
                {dossier && !dossier.narrative_unavailable && (
                    <p className="mt-3 text-sm text-foreground/80">{dossier.one_line_thesis}</p>
                )}
            </CardHeader>

            <CardContent className="pt-0">
                {/* Expand / actions row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpanded((v) => !v)}
                        className="h-8 gap-1.5 -ml-2"
                    >
                        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {expanded ? "Hide details" : "Show full dossier"}
                    </Button>
                    <div className="flex gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => onFeedback(candidate.isin, "acted")}
                            disabled={feedbackPending}
                        >
                            <Check className="h-3.5 w-3.5" />
                            Acted on this
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => onFeedback(candidate.isin, "passed")}
                            disabled={feedbackPending}
                        >
                            <X className="h-3.5 w-3.5" />
                            Passed
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-muted-foreground"
                            onClick={() => onFeedback(candidate.isin, "rejected")}
                            disabled={feedbackPending}
                        >
                            <EyeOff className="h-3.5 w-3.5" />
                            Not interested (90d)
                        </Button>
                    </div>
                </div>

                {expanded && (
                    <div className="mt-4 space-y-4">
                        <Separator />

                        {/* Dossier */}
                        {dossier && !dossier.narrative_unavailable ? (
                            <div className="space-y-4">
                                <DossierSection label="Bull case" items={dossier.bull_case} tone="positive" />
                                <DossierSection label="Bear case" items={dossier.bear_case} tone="negative" />
                                <DossierSection label="Key risks" items={dossier.key_risks} tone="neutral" />
                                <Section label="Valuation verdict">
                                    <p className="text-sm">{dossier.valuation_verdict}</p>
                                </Section>
                                <Section label="Portfolio fit">
                                    <p className="text-sm">{dossier.portfolio_fit}</p>
                                </Section>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">
                                Dossier narrative unavailable
                                {dossier?.narrative_unavailable_reason && ` (${dossier.narrative_unavailable_reason})`}.
                                Signal data below is still trustworthy.
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

                        {/* Quality gates */}
                        <Section label="Quality gates">
                            <div className="space-y-1">
                                {candidate.gates.map((g) => (
                                    <div key={g.gate_name} className="flex items-center gap-2 text-xs">
                                        <span className={
                                            g.skipped ? "text-muted-foreground"
                                                : g.passed ? "text-emerald-600 dark:text-emerald-500"
                                                    : "text-red-600 dark:text-red-500"
                                        }>
                                            {g.skipped ? "⊘" : g.passed ? "✓" : "✗"}
                                        </span>
                                        <span className="font-mono">{g.gate_name}:</span>
                                        <span className="text-muted-foreground">
                                            {g.skipped ? g.skip_reason : `${g.threshold} | ${g.actual_value}`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Section>

                        {/* Price context */}
                        <Section label="Price">
                            <p className="font-mono text-sm">
                                {inr(candidate.current_price)} as of {candidate.price_as_of?.slice(0, 10) ?? "—"}
                            </p>
                        </Section>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function GroupBar({ label, value }: { label: string; value: number }) {
    const fillColor =
        value >= 70 ? "bg-emerald-500"
            : value >= 50 ? "bg-blue-500"
                : value >= 30 ? "bg-amber-500"
                    : "bg-red-500";

    return (
        <div>
            <div className="flex items-baseline justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono">{value.toFixed(0)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                    className={`h-full ${fillColor}`}
                    style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                />
            </div>
        </div>
    );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</h3>
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
        tone === "positive" ? "border-l-emerald-500"
            : tone === "negative" ? "border-l-red-500"
                : "border-l-amber-500";

    return (
        <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</h3>
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