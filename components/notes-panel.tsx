"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError, type Holding, type UpdateHoldingPayload } from "@/lib/api";
import { inr } from "@/lib/format";

interface NotesPanelProps {
    holding: Holding;
}

export function NotesPanel({ holding }: NotesPanelProps) {
    const [editing, setEditing] = useState(false);
    const queryClient = useQueryClient();

    // Form state — initialized from current holding values
    const [thesis, setThesis] = useState(holding.thesis ?? "");
    const [userNotes, setUserNotes] = useState(holding.user_notes ?? "");
    const [stopLoss, setStopLoss] = useState(holding.stop_loss ?? "");
    const [targetPrice, setTargetPrice] = useState(holding.target_price ?? "");
    const [tagsInput, setTagsInput] = useState((holding.tags ?? []).join(", "));

    // #78 U7-e: re-sync form state when the holding prop changes WHILE NOT
    // editing (e.g. after an external recompute from a corp action). useState
    // seeds only at mount, so without this, clicking Edit later showed STALE
    // field values and a Save could overwrite fresh backend data. We only
    // re-seed when not mid-edit, so an in-progress edit is never clobbered.
    useEffect(() => {
        if (!editing) {
            setThesis(holding.thesis ?? "");
            setUserNotes(holding.user_notes ?? "");
            setStopLoss(holding.stop_loss ?? "");
            setTargetPrice(holding.target_price ?? "");
            setTagsInput((holding.tags ?? []).join(", "));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        holding.isin,
        holding.thesis,
        holding.user_notes,
        holding.stop_loss,
        holding.target_price,
        holding.tags,
    ]);

    const mutation = useMutation({
        mutationFn: (payload: UpdateHoldingPayload) =>
            api.updateHolding(holding.isin, payload),
        onSuccess: () => {
            toast.success("Notes saved");
            queryClient.refetchQueries({ queryKey: ["holding", holding.isin] });
            // Also invalidate dashboard queries so any tag/note shown on the main
            // dashboard stays in sync.
            queryClient.refetchQueries({ queryKey: ["dashboard"] });
            setEditing(false);
        },
        onError: (err: Error) => {
            const message = err instanceof ApiError ? err.detail : err.message;
            toast.error("Failed to save", { description: message });
        },
    });

    const handleSave = () => {
        // Normalize tags from comma-separated input
        const tags = tagsInput
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0);

        const payload: UpdateHoldingPayload = {
            thesis: thesis.trim() || null,
            user_notes: userNotes.trim() || null,
            tags,
            stop_loss: stopLoss.trim() || null,
            target_price: targetPrice.trim() || null,
        };

        // Basic validation: stop_loss and target_price must be numeric if non-empty
        if (payload.stop_loss && Number.isNaN(parseFloat(payload.stop_loss))) {
            toast.error("Stop loss must be a number");
            return;
        }
        if (payload.target_price && Number.isNaN(parseFloat(payload.target_price))) {
            toast.error("Target price must be a number");
            return;
        }

        mutation.mutate(payload);
    };

    const handleCancel = () => {
        // Revert form state to original holding values
        setThesis(holding.thesis ?? "");
        setUserNotes(holding.user_notes ?? "");
        setStopLoss(holding.stop_loss ?? "");
        setTargetPrice(holding.target_price ?? "");
        setTagsInput((holding.tags ?? []).join(", "));
        setEditing(false);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <CardTitle>Your Notes</CardTitle>
                        <CardDescription>Thesis, targets, and tags</CardDescription>
                    </div>
                    {editing ? (
                        <div className="flex gap-1.5">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancel}
                                disabled={mutation.isPending}
                                className="gap-1.5"
                            >
                                <X className="h-3.5 w-3.5" />
                                Cancel
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleSave}
                                disabled={mutation.isPending}
                            >
                                {mutation.isPending ? "Saving…" : "Save"}
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditing(true)}
                            className="gap-1.5"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {editing ? (
                    <EditMode
                        thesis={thesis}
                        setThesis={setThesis}
                        userNotes={userNotes}
                        setUserNotes={setUserNotes}
                        stopLoss={stopLoss}
                        setStopLoss={setStopLoss}
                        targetPrice={targetPrice}
                        setTargetPrice={setTargetPrice}
                        tagsInput={tagsInput}
                        setTagsInput={setTagsInput}
                        disabled={mutation.isPending}
                    />
                ) : (
                    <ReadMode holding={holding} />
                )}
            </CardContent>
        </Card>
    );
}

// ── Read mode ───────────────────────────────────────────────────────────────

function ReadMode({ holding }: { holding: Holding }) {
    return (
        <>
            <Section label="Thesis">
                {holding.thesis ? (
                    <p className="text-sm leading-relaxed text-foreground">{holding.thesis}</p>
                ) : (
                    <EmptyHint>No thesis yet. Click Edit to add one.</EmptyHint>
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
        </>
    );
}

// ── Edit mode ───────────────────────────────────────────────────────────────

interface EditModeProps {
    thesis: string;
    setThesis: (v: string) => void;
    userNotes: string;
    setUserNotes: (v: string) => void;
    stopLoss: string;
    setStopLoss: (v: string) => void;
    targetPrice: string;
    setTargetPrice: (v: string) => void;
    tagsInput: string;
    setTagsInput: (v: string) => void;
    disabled: boolean;
}

function EditMode(props: EditModeProps) {
    return (
        <>
            <div className="space-y-1.5">
                <Label htmlFor="thesis-input" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Thesis
                </Label>
                <Textarea
                    id="thesis-input"
                    rows={3}
                    placeholder="Why you bought this. What conditions support holding it. What would invalidate the thesis."
                    value={props.thesis}
                    onChange={(e) => props.setThesis(e.target.value)}
                    disabled={props.disabled}
                />
            </div>

            <Separator />

            <div className="space-y-1.5">
                <Label htmlFor="notes-input" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Notes
                </Label>
                <Textarea
                    id="notes-input"
                    rows={3}
                    placeholder="Anything else worth remembering — earnings dates, news, reminders."
                    value={props.userNotes}
                    onChange={(e) => props.setUserNotes(e.target.value)}
                    disabled={props.disabled}
                />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="sl-input" className="text-xs uppercase tracking-wider text-muted-foreground">
                        Stop Loss (₹)
                    </Label>
                    <Input
                        id="sl-input"
                        type="number"
                        step="0.01"
                        placeholder="e.g. 4500"
                        value={props.stopLoss}
                        onChange={(e) => props.setStopLoss(e.target.value)}
                        disabled={props.disabled}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="tp-input" className="text-xs uppercase tracking-wider text-muted-foreground">
                        Target Price (₹)
                    </Label>
                    <Input
                        id="tp-input"
                        type="number"
                        step="0.01"
                        placeholder="e.g. 5500"
                        value={props.targetPrice}
                        onChange={(e) => props.setTargetPrice(e.target.value)}
                        disabled={props.disabled}
                    />
                </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
                <Label htmlFor="tags-input" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Tags
                </Label>
                <Input
                    id="tags-input"
                    placeholder="comma-separated, e.g. retail, long-term, demerger-play"
                    value={props.tagsInput}
                    onChange={(e) => props.setTagsInput(e.target.value)}
                    disabled={props.disabled}
                />
                <p className="text-xs text-muted-foreground">
                    Separate with commas. Lowercase recommended.
                </p>
            </div>
        </>
    );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

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