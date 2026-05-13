"use client";

/**
 * Reusable info-icon popover for explainability content across the
 * Suggestions page. Wraps the existing shadcn Popover primitives so every
 * QVMN bar / signal / gate / confidence chip / feedback button uses the
 * same trigger and content styling.
 */

import { Info } from "lucide-react";
import { ReactNode } from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
    title: string;
    children: ReactNode;
    ariaLabel?: string;
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
    iconClassName?: string;
}

export function ExplainPopover({
    title,
    children,
    ariaLabel,
    side = "top",
    align = "center",
    iconClassName,
}: Props) {
    return (
        <Popover>
            <PopoverTrigger
                type="button"
                aria-label={ariaLabel ?? `Explain ${title}`}
                className={cn(
                    "inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    iconClassName,
                )}
            >
                <Info className="h-3 w-3" />
            </PopoverTrigger>
            <PopoverContent side={side} align={align} className="w-80 leading-relaxed">
                <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <div className="space-y-2 text-xs text-muted-foreground">
                        {children}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}