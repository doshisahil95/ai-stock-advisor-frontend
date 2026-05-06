"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, Printer } from "lucide-react";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { dateTime, inr, inrSigned } from "@/lib/format";

export default function CostBasisPage() {
    const adjQuery = useQuery({
        queryKey: ["cost-basis", "adjustments"],
        queryFn: api.getCostBasisAdjustments,
    });

    const totalsQuery = useQuery({
        queryKey: ["dashboard", "summary"],
        queryFn: api.getSummary,
    });

    return (
        <main className="min-h-screen bg-background">
            <div className="mx-auto max-w-4xl px-4 py-6 print:px-0 md:px-6 lg:px-8">
                {/* Top bar (hidden on print) */}
                <div className="mb-6 print:hidden">
                    <Link href="/" className="inline-flex">
                        <Button variant="ghost" size="sm" className="-ml-3 h-8 gap-2 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back to portfolio
                        </Button>
                    </Link>
                </div>

                {/* Header (printable) */}
                <header className="mb-6 flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Cost Basis — Tax vs Broker</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Audit trail of every IT-Act-driven divergence between our tax-correct cost basis
                            and ICICI&apos;s nominal cost. Share this page with your CA for verification.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 print:hidden"
                        onClick={() => window.print()}
                    >
                        <Printer className="h-3.5 w-3.5" />
                        Print
                    </Button>
                </header>

                {/* Summary numbers */}
                {totalsQuery.isLoading ? (
                    <Skeleton className="mb-6 h-32" />
                ) : (
                    totalsQuery.data && (
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle className="text-base">Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                                    <SummaryRow label="Tax-basis invested (ours)" value={inr(totalsQuery.data.totals.invested)} />
                                    <SummaryRow
                                        label="Broker-basis invested (ICICI)"
                                        value={
                                            totalsQuery.data.totals.broker_invested
                                                ? inr(totalsQuery.data.totals.broker_invested)
                                                : "—"
                                        }
                                    />
                                    <SummaryRow
                                        label="Difference"
                                        value={
                                            totalsQuery.data.totals.broker_invested
                                                ? inrSigned(
                                                    (
                                                        parseFloat(totalsQuery.data.totals.invested) -
                                                        parseFloat(totalsQuery.data.totals.broker_invested)
                                                    ).toFixed(2)
                                                )
                                                : "—"
                                        }
                                    />
                                </div>
                                <p className="mt-3 text-xs italic text-muted-foreground">
                                    The difference equals the sum of all active adjustments listed below.
                                </p>
                            </CardContent>
                        </Card>
                    )
                )}

                {/* Adjustments list */}
                {adjQuery.isLoading && <Skeleton className="h-96" />}
                {adjQuery.data && adjQuery.data.length === 0 && (
                    <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No adjustments recorded — your cost basis matches the broker exactly.
                        </CardContent>
                    </Card>
                )}
                {adjQuery.data && adjQuery.data.length > 0 && (
                    <div className="space-y-6">
                        {adjQuery.data.map((adj) => (
                            <Card key={adj._id} className="break-inside-avoid">
                                <CardHeader>
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <CardTitle className="text-lg">{adj.name}</CardTitle>
                                        <span className={`font-mono text-base ${parseFloat(adj.amount) < 0 ? "text-red-600 dark:text-red-500" : "text-emerald-600 dark:text-emerald-500"}`}>
                                            {inrSigned(adj.amount)}
                                        </span>
                                    </div>
                                    <CardDescription>
                                        {adj.it_act_section} · effective {new Date(adj.effective_date).toLocaleDateString("en-IN", {
                                            day: "numeric",
                                            month: "long",
                                            year: "numeric",
                                            timeZone: "Asia/Kolkata",
                                        })}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Section label="Calculation">
                                        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{adj.calculation}</pre>
                                    </Section>
                                    <Separator />
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Section label="Broker treatment">
                                            <p className="text-sm leading-relaxed">{adj.broker_treatment}</p>
                                        </Section>
                                        <Section label="Our treatment">
                                            <p className="text-sm leading-relaxed">{adj.our_treatment}</p>
                                        </Section>
                                    </div>
                                    <Separator />
                                    <Section label="Why our way is correct">
                                        <p className="text-sm leading-relaxed">{adj.rationale}</p>
                                    </Section>
                                    {adj.source_documents.length > 0 && (
                                        <>
                                            <Separator />
                                            <Section label="Source documents">
                                                <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                                                    {adj.source_documents.map((doc, i) => (
                                                        <li key={i}>{doc}</li>
                                                    ))}
                                                </ul>
                                            </Section>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Footer for print */}
                <footer className="mt-8 hidden border-t pt-4 text-xs text-muted-foreground print:block">
                    <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        <span>Generated from Portfolio Advisor — {dateTime(new Date().toISOString())}</span>
                    </div>
                </footer>
            </div>
        </main>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md border bg-card p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-1 font-mono text-base">{value}</p>
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