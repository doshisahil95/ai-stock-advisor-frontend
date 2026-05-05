"use client";

import { Pencil } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import type { Holding } from "@/lib/api";
import { inr } from "@/lib/format";

interface NotesPanelProps {
    holding: Holding;
}

export function NotesPanel({ holding }: NotesPanelProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <CardTitle>Your Notes</CardTitle>
                        <CardDescription>Thesis, targets, and tags</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" disabled className="gap-1.5">
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <Section label="Thesis">
                    {holding.thesis ? (
                        <p className="text-sm leading-relaxed text-foreground">{holding.thesis}</p>
                    ) : (
                        <EmptyHint>No thesis yet. Edit to add one.</EmptyHint>
                    )}
                </Section>

                <Separator />

                <Section label="Notes">
                    {holding.user_notes ? (
                        <p className="text-sm leading-relaxed text-foreground">{holding.user_notes}</p>
                    ) : (
                        <EmptyHint>No notes yet.</EmptyHint>
                    )}
                </Section>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                    <Section label="Stop Loss">
                        <p className="font-mono text-sm">
                            {holding.stop_loss ? inr(holding.stop_loss) : <EmptyHint inline>—</EmptyHint>}
                        </p>
                    </Section>
                    <Section label="Target Price">
                        <p className="font-mono text-sm">
                            {holding.target_price ? inr(holding.target_price) : <EmptyHint inline>—</EmptyHint>}
                        </p>
                    </Section>
                </div>

                <Separator />

                <Section label="Tags">
                    {holding.tags && holding.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                            {holding.tags.map((t) => (
                                <Badge key={t} variant="secondary" className="text-xs">
                                    {t}
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <EmptyHint>No tags.</EmptyHint>
                    )}
                </Section>
            </CardContent>
        </Card>
    );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {label}
            </h3>
            {children}
        </div>
    );
}

function EmptyHint({
    children,
    inline = false,
}: {
    children: React.ReactNode;
    inline?: boolean;
}) {
    return (
        <span
            className={`text-sm italic text-muted-foreground/60 ${inline ? "" : "block"}`}
        >
            {children}
        </span>
    );
}