"use client";

/**
 * "How to read this page" collapsible block for /suggestions. Driven by
 * run.page_intro from the backend. Default-open. Local state (no
 * persistence) — minor friction is acceptable for a help block.
 */

import { ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PageIntro as PageIntroData } from "@/lib/api";

export function PageIntro({ data }: { data?: PageIntroData }) {
    const [open, setOpen] = useState(true);
    if (!data) return null;
    return (
        <Card className="border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    {data.title}
                </CardTitle>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpen((v) => !v)}
                    aria-label={open ? "Collapse" : "Expand"}
                    aria-expanded={open}
                    className="h-7"
                >
                    {open ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                    )}
                </Button>
            </CardHeader>
            {open && (
                <CardContent className="space-y-3">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        {data.summary}
                    </p>
                    {data.bullets?.length ? (
                        <ul className="space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                            {data.bullets.map((b, i) => (
                                <li key={i} className="flex gap-2">
                                    <span className="text-amber-600 dark:text-amber-400">•</span>
                                    <span>{b}</span>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </CardContent>
            )}
        </Card>
    );
}