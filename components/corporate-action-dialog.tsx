"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    api,
    ApiError,
    type CorporateActionPayload,
    type CorporateActionType,
} from "@/lib/api";

const ISIN_RE = /^[A-Z0-9]{12}$/;
const todayStr = () => new Date().toISOString().split("T")[0];

// #72 U1-e: NaN-safe numeric guards. `Number("abc") <= 0` is false and
// `NaN >= 1` is false, so the old comparisons let a non-numeric string slip past
// client validation and get POSTed as a bad Decimal string. Require a finite
// number explicitly.
const isPosNum = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0;
};
const isFraction = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 && n < 1;
};

/**
 * #68 — record a SPLIT / BONUS / demerger once. The backend auto-maps it onto
 * holdings via the single FIFO source of truth (no manual math). A demerger
 * also auto-creates the §49(2C) cost_basis_adjustment and returns the parent
 * BUY-row reprice as an audited follow-up (apply via the transaction edit
 * flow) — we surface that clearly rather than silently mutating the ledger.
 *
 * Plain useState + useMutation (matches this page's style, not react-hook-form)
 * with a synchronous refetchQueries fan-out mirroring the delete mutation.
 */
export function CorporateActionDialog() {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const [actionType, setActionType] = useState<CorporateActionType>("split");
    const [isin, setIsin] = useState("");
    const [symbol, setSymbol] = useState("");
    const [exchange, setExchange] = useState<"NSE" | "BSE">("NSE");
    const [tradeDate, setTradeDate] = useState("");
    const [notes, setNotes] = useState("");
    const [sourceRef, setSourceRef] = useState("");

    // split / bonus
    const [ratioFrom, setRatioFrom] = useState("");
    const [ratioTo, setRatioTo] = useState("");
    const [bonusQty, setBonusQty] = useState("");

    // demerger
    const [childIsin, setChildIsin] = useState("");
    const [childSymbol, setChildSymbol] = useState("");
    const [childQty, setChildQty] = useState("");
    const [childCostPct, setChildCostPct] = useState("");
    const [parentTotalCost, setParentTotalCost] = useState("");
    const [acquiredDate, setAcquiredDate] = useState("");

    const reset = () => {
        setActionType("split");
        setIsin("");
        setSymbol("");
        setExchange("NSE");
        setTradeDate("");
        setNotes("");
        setSourceRef("");
        setRatioFrom("");
        setRatioTo("");
        setBonusQty("");
        setChildIsin("");
        setChildSymbol("");
        setChildQty("");
        setChildCostPct("");
        setParentTotalCost("");
        setAcquiredDate("");
    };

    const validationError = useMemo<string | null>(() => {
        if (!ISIN_RE.test(isin.toUpperCase()))
            return "ISIN must be 12 uppercase alphanumerics.";
        if (!symbol.trim()) return "Symbol is required.";
        if (!tradeDate) return "Event date is required.";
        if (tradeDate > todayStr()) return "Event date cannot be in the future.";

        if (actionType === "split" || actionType === "bonus") {
            if (!ratioFrom || !ratioTo) return "Both ratio fields are required.";
            if (!isPosNum(ratioFrom) || !isPosNum(ratioTo))
                return "Ratios must be positive numbers.";
            if (actionType === "bonus" && bonusQty.trim() && !isPosNum(bonusQty))
                return "Bonus quantity must be a positive number.";
        }

        if (actionType === "demerger") {
            if (!ISIN_RE.test(childIsin.toUpperCase()))
                return "Child ISIN must be 12 uppercase alphanumerics.";
            if (!childSymbol.trim()) return "Child symbol is required.";
            if (!isPosNum(childQty))
                return "Child quantity must be a positive number.";
            if (!isFraction(childCostPct))
                return "Child cost % must be a number strictly between 0 and 1 (e.g. 0.3115).";
            if (!isPosNum(parentTotalCost))
                return "Parent total cost must be a positive number.";
        }
        return null;
    }, [
        actionType,
        isin,
        symbol,
        tradeDate,
        ratioFrom,
        ratioTo,
        bonusQty,
        childIsin,
        childSymbol,
        childQty,
        childCostPct,
        parentTotalCost,
    ]);

    const mutation = useMutation({
        mutationFn: () => {
            const payload: CorporateActionPayload = {
                action_type: actionType,
                isin: isin.toUpperCase(),
                symbol: symbol.trim().toUpperCase(),
                exchange, // #72 U1-f: send the exchange (was defaulted server-side)
                trade_date: new Date(tradeDate).toISOString(),
                notes: notes.trim() || undefined,
                source_ref: sourceRef.trim() || undefined,
            };
            if (actionType === "split" || actionType === "bonus") {
                payload.ratio_from = Number(ratioFrom);
                payload.ratio_to = Number(ratioTo);
            }
            if (actionType === "bonus" && bonusQty.trim()) {
                payload.bonus_quantity = bonusQty.trim();
            }
            if (actionType === "demerger") {
                payload.child_isin = childIsin.toUpperCase();
                payload.child_symbol = childSymbol.trim().toUpperCase();
                payload.child_quantity = childQty.trim();
                payload.child_cost_pct = childCostPct.trim();
                payload.parent_total_cost = parentTotalCost.trim();
                if (acquiredDate)
                    payload.acquired_date = new Date(acquiredDate).toISOString();
            }
            return api.recordCorporateAction(payload);
        },
        onSuccess: async (resp) => {
            await Promise.all([
                queryClient.refetchQueries({ queryKey: ["transactions"] }),
                queryClient.refetchQueries({ queryKey: ["holding", resp.isin] }),
                resp.child_isin
                    ? queryClient.refetchQueries({
                          queryKey: ["holding", resp.child_isin],
                      })
                    : Promise.resolve(),
                queryClient.refetchQueries({ queryKey: ["dashboard"] }),
                // #72 U1-h: a demerger auto-creates a §49(2C) cost_basis_adjustment
                // and every corp action changes quantities/cost, so the cost-basis
                // and reconciliation views must refresh too (prefix-matches
                // ["cost-basis","adjustments"] and the ["reconciliation",...] keys).
                queryClient.refetchQueries({ queryKey: ["cost-basis"] }),
                queryClient.refetchQueries({ queryKey: ["reconciliation"] }),
            ]);

            if (resp.status === "already_recorded") {
                toast.info("Already recorded", {
                    description:
                        "A transaction with this reference already exists — no change made.",
                });
            } else if (resp.status === "recorded_with_warning") {
                toast.warning("Recorded, but holding may be stale", {
                    description: resp.warning ?? "Re-run recompute for this ISIN.",
                });
            } else if (actionType === "demerger") {
                // #72 U1-g: guard interpolation — a recorded_with_warning or an
                // unexpected shape can leave these undefined; never render
                // "₹undefined/sh".
                const n = resp.parent_reprice?.length ?? 0;
                const perShare = resp.child_cost_per_share
                    ? `at ₹${resp.child_cost_per_share}/sh `
                    : "";
                const factor = resp.parent_retained_factor
                    ? ` (×${resp.parent_retained_factor})`
                    : "";
                toast.success("Demerger recorded", {
                    description:
                        `Child ${resp.child_isin ?? ""} created ${perShare}`.trim() +
                        `; §49(2C) adjustment logged. ${n} parent BUY row(s) still need ` +
                        `a cost reduction${factor} — apply via ` +
                        `the transaction edit flow to keep the audit trail intact.`,
                    duration: 12000,
                });
            } else {
                toast.success(
                    `${actionType === "split" ? "Split" : "Bonus"} recorded`,
                    {
                        description:
                            actionType === "bonus" && resp.bonus_quantity
                                ? `${resp.bonus_quantity} bonus shares added. Holding recomputed.`
                                : "Holding recomputed.",
                    },
                );
            }
            setOpen(false);
            reset();
        },
        onError: (err: Error) => {
            const message = err instanceof ApiError ? err.detail : err.message;
            toast.error("Could not record corporate action", { description: message });
        },
    });

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                setOpen(o);
                if (!o) reset();
            }}
        >
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    Record corporate action
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Record a corporate action</DialogTitle>
                    <DialogDescription>
                        Record a split, bonus, or demerger once — the holding and cost
                        basis are recomputed automatically. The cost math is FIFO-correct;
                        you don&apos;t compute anything by hand.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-1">
                    <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                            Action type
                        </Label>
                        <Select
                            value={actionType}
                            onValueChange={(v) => setActionType(v as CorporateActionType)}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="split">Split</SelectItem>
                                <SelectItem value="bonus">Bonus</SelectItem>
                                <SelectItem value="demerger">Demerger</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                {actionType === "demerger" ? "Parent ISIN" : "ISIN"}
                            </Label>
                            <Input
                                placeholder="INE155A01022"
                                value={isin}
                                onChange={(e) => setIsin(e.target.value.toUpperCase())}
                                maxLength={12}
                                className="h-9 font-mono"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                {actionType === "demerger" ? "Parent symbol" : "Symbol"}
                            </Label>
                            <Input
                                placeholder="TMPV"
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                className="h-9 font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                Event date
                            </Label>
                            <Input
                                type="date"
                                value={tradeDate}
                                max={todayStr()}
                                onChange={(e) => setTradeDate(e.target.value)}
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                Exchange
                            </Label>
                            <Select
                                value={exchange}
                                onValueChange={(v) => setExchange(v as "NSE" | "BSE")}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NSE">NSE</SelectItem>
                                    <SelectItem value="BSE">BSE</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* SPLIT / BONUS ratios */}
                    {(actionType === "split" || actionType === "bonus") && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                    Ratio from
                                </Label>
                                <Input
                                    type="number"
                                    min={1}
                                    placeholder="1"
                                    value={ratioFrom}
                                    onChange={(e) => setRatioFrom(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                    Ratio to
                                </Label>
                                <Input
                                    type="number"
                                    min={1}
                                    placeholder={actionType === "split" ? "10" : "1"}
                                    value={ratioTo}
                                    onChange={(e) => setRatioTo(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                            <p className="col-span-2 text-xs text-muted-foreground">
                                {actionType === "split"
                                    ? "e.g. 1 → 10 for a 1:10 split (10 new shares for each 1 held; total cost unchanged)."
                                    : "e.g. 1 → 1 for a 1:1 bonus (1 bonus share for each 1 held). Bonus shares are zero-cost."}
                            </p>
                        </div>
                    )}

                    {/* BONUS optional explicit quantity */}
                    {actionType === "bonus" && (
                        <div className="space-y-1.5">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                Bonus quantity (optional)
                            </Label>
                            <Input
                                type="number"
                                min={0}
                                step="any"
                                placeholder="auto from holding × ratio"
                                value={bonusQty}
                                onChange={(e) => setBonusQty(e.target.value)}
                                className="h-9"
                            />
                            <p className="text-xs text-muted-foreground">
                                Leave blank to compute from your current holding × the ratio.
                                Set it only when the broker&apos;s allotment differs (e.g. CONCOR
                                credited 1 bonus for 6 held).
                            </p>
                        </div>
                    )}

                    {/* DEMERGER child + §49(2C) */}
                    {actionType === "demerger" && (
                        <div className="space-y-3 rounded-md border border-dashed p-3">
                            <p className="text-xs font-medium text-muted-foreground">
                                Child (new) company + §49(2C) cost apportionment
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                        Child ISIN
                                    </Label>
                                    <Input
                                        placeholder="INE1TAE01010"
                                        value={childIsin}
                                        onChange={(e) => setChildIsin(e.target.value.toUpperCase())}
                                        maxLength={12}
                                        className="h-9 font-mono"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                        Child symbol
                                    </Label>
                                    <Input
                                        placeholder="TMCV"
                                        value={childSymbol}
                                        onChange={(e) => setChildSymbol(e.target.value.toUpperCase())}
                                        className="h-9 font-mono"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                        Child quantity received
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        step="any"
                                        placeholder="100"
                                        value={childQty}
                                        onChange={(e) => setChildQty(e.target.value)}
                                        className="h-9"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                        Child cost fraction
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={1}
                                        step="any"
                                        placeholder="0.3115"
                                        value={childCostPct}
                                        onChange={(e) => setChildCostPct(e.target.value)}
                                        className="h-9"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                        Parent total cost (₹)
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        step="any"
                                        placeholder="81337.00"
                                        value={parentTotalCost}
                                        onChange={(e) => setParentTotalCost(e.target.value)}
                                        className="h-9"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                        Parent acquired date
                                    </Label>
                                    <Input
                                        type="date"
                                        value={acquiredDate}
                                        max={todayStr()}
                                        onChange={(e) => setAcquiredDate(e.target.value)}
                                        className="h-9"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Child cost fraction is the §49(2C) share of the parent&apos;s original
                                cost that moves to the child (e.g. 0.3115 = 31.15%). The parent&apos;s
                                acquired date is inherited by the child for STCG/LTCG. The parent&apos;s
                                own cost reduction is returned as an audited follow-up — apply it via
                                the transaction edit flow.
                            </p>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                            Reference (optional, for idempotency)
                        </Label>
                        <Input
                            placeholder="SPLIT_TATASTEEL_2022:1to10"
                            value={sourceRef}
                            onChange={(e) => setSourceRef(e.target.value)}
                            className="h-9 font-mono"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                            Notes (optional)
                        </Label>
                        <Textarea
                            rows={2}
                            placeholder="Any context worth keeping."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    {validationError && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                            {validationError}
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setOpen(false);
                            reset();
                        }}
                        disabled={mutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => mutation.mutate()}
                        disabled={mutation.isPending || validationError !== null}
                    >
                        {mutation.isPending ? "Recording…" : "Record"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
