"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, TrendingUp } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api, ApiError, type Holding } from "@/lib/api";
import { inr } from "@/lib/format";

const today = () => new Date().toISOString().split("T")[0];

const formSchema = z.object({
    quantity: z.coerce.number().positive("Must be positive"),
    price: z.coerce.number().positive("Must be positive"),
    fees: z.coerce.number().min(0, "Cannot be negative").default(0),
    trade_date: z.string().min(1, "Required"),
    notes: z.string().max(500).optional(),
});

/**
 * A brand-new stock the user does NOT yet hold, resolved via /instruments/search.
 * #54: BuySheet is polymorphic over its target — either an existing `holding`
 * (buy-more mode, unchanged) or a resolved `instrument` (add-holding mode). Both
 * modes drive the SAME api.recordBuy mutation and POST /portfolio/holdings, which
 * creates-or-adds a holding via FIFO recompute — no backend change (#54).
 */
export interface BuyInstrument {
    symbol: string;
    exchange: string;
    isin: string;
    name?: string | null;
}

// Discriminated props: pass EITHER `holding` (buy more) OR `instrument` (add new).
type BuySheetProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
} & (
    | { holding: Holding; instrument?: never }
    | { instrument: BuyInstrument; holding?: never }
);

export function BuySheet(props: BuySheetProps) {
    const { open, onOpenChange } = props;
    const queryClient = useQueryClient();

    // Mode-invariant identity (used by the mutation + toast, valid in both modes).
    const isAddMode = "instrument" in props && props.instrument !== undefined;
    const symbol = isAddMode ? props.instrument!.symbol : props.holding!.symbol;
    const exchange = isAddMode ? props.instrument!.exchange : props.holding!.exchange;
    const isin = isAddMode ? props.instrument!.isin : props.holding!.isin;

    // In buy-more mode we prefill the price with the holding's live current price
    // and preview the resulting blended average. In add mode there is no existing
    // position or known current price, so the price field starts empty.
    const currentPrice =
        !isAddMode && props.holding!.current_price
            ? parseFloat(props.holding!.current_price)
            : 0;

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            quantity: 0,
            price: currentPrice,
            fees: 0,
            trade_date: today(),
            notes: "",
        },
    });

    // Reset form when the sheet opens. In buy-more mode also refetch the holding
    // so the prefilled current price is fresh.
    useEffect(() => {
        if (open) {
            if (!isAddMode) {
                queryClient.refetchQueries({ queryKey: ["holding", isin] });
            }
            form.reset({
                quantity: 0,
                price: currentPrice,
                fees: 0,
                trade_date: today(),
                notes: "",
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Live preview of the resulting position.
    const qty = Number(form.watch("quantity")) || 0;
    const price = Number(form.watch("price")) || 0;
    const fees = Number(form.watch("fees")) || 0;

    const existingQty = isAddMode ? 0 : parseFloat(props.holding!.quantity);
    const existingInvested = isAddMode ? 0 : parseFloat(props.holding!.invested_amount);
    const newQty = existingQty + qty;
    const newInvested = existingInvested + qty * price + fees;
    const newAvgCost = newQty > 0 ? newInvested / newQty : 0;

    const mutation = useMutation({
        mutationFn: (values: z.output<typeof formSchema>) =>
            api.recordBuy({
                symbol,
                exchange,
                // #54: pass the ISIN explicitly in add mode (already resolved by the
                // instrument search) so the backend skips its lookup_isin fallback.
                // In buy-more mode the symbol resolves to the same held ISIN anyway.
                ...(isAddMode ? { isin } : {}),
                quantity: values.quantity.toString(),
                price: values.price.toString(),
                total_fees: values.fees.toString(),
                trade_date: new Date(values.trade_date).toISOString(),
            }),
        onSuccess: async (updated) => {
            // Force-refetch (not just invalidate) so the UI reflects new state now.
            await Promise.all([
                queryClient.refetchQueries({ queryKey: ["holding", isin] }),
                // #78 U7-g: prefix ["transactions"] so BOTH the per-ISIN list
                // (["transactions", isin]) and the transactions page's search
                // key (["transactions","search",...]) refetch. The narrower
                // ["transactions", isin] missed the search page.
                queryClient.refetchQueries({ queryKey: ["transactions"] }),
                queryClient.refetchQueries({ queryKey: ["dashboard"] }),
                queryClient.refetchQueries({ queryKey: ["reconciliation"] }),
            ]);
            toast.success(
                `Recorded BUY of ${qty} ${symbol} at ${inr(price)}`,
                {
                    description: isAddMode
                        ? `New holding created · avg cost ${inr(updated.avg_cost)}`
                        : `New avg cost: ${inr(updated.avg_cost)}`,
                }
            );
            onOpenChange(false);
        },
        onError: (err: Error) => {
            const message = err instanceof ApiError ? err.detail : err.message;
            toast.error("Buy failed", { description: message });
        },
    });

    const title = isAddMode ? `Add holding — ${symbol}` : `Buy more ${symbol}`;
    const description = isAddMode
        ? `Record a brand-new purchase of ${symbol}${
              props.instrument!.name ? ` (${props.instrument!.name})` : ""
          }. This creates a new holding.`
        : `Currently hold ${existingQty} shares at avg ${inr(
              props.holding!.avg_cost
          )}. Current price: `;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col gap-6 overflow-y-auto sm:max-w-md">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                        {title}
                    </SheetTitle>
                    <SheetDescription>
                        {description}
                        {!isAddMode && (
                            <span className="font-mono">{inr(currentPrice)}</span>
                        )}
                    </SheetDescription>
                </SheetHeader>

                <form
                    onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
                    className="flex flex-1 flex-col gap-5 px-4"
                >
                    <FormField
                        label="Quantity"
                        error={form.formState.errors.quantity?.message}
                    >
                        <Input
                            type="number"
                            step="any" /* #80 L9: allow fractional qty (bonus/demerger) */
                            placeholder="10"
                            {...form.register("quantity")}
                        />
                    </FormField>

                    <FormField
                        label="Price per share (₹)"
                        hint={
                            isAddMode
                                ? "Your buy price per share"
                                : "Pre-filled with current market price"
                        }
                        error={form.formState.errors.price?.message}
                    >
                        <Input
                            type="number"
                            step="0.01"
                            {...form.register("price")}
                        />
                    </FormField>

                    <FormField
                        label="Fees (₹)"
                        hint="Brokerage + STT + GST etc."
                        error={form.formState.errors.fees?.message}
                    >
                        <Input
                            type="number"
                            step="0.01"
                            {...form.register("fees")}
                        />
                    </FormField>

                    <FormField
                        label="Trade date"
                        hint="Backdate if recording an old trade"
                        error={form.formState.errors.trade_date?.message}
                    >
                        <div className="relative">
                            <Input
                                type="date"
                                max={today()}
                                {...form.register("trade_date")}
                            />
                            <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        </div>
                    </FormField>

                    {/* Live preview */}
                    {qty > 0 && price > 0 && (
                        <>
                            <Separator />
                            <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
                                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    {isAddMode ? "This purchase" : "After this BUY"}
                                </h3>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <PreviewCell label="Qty" value={`${newQty}`} />
                                    <PreviewCell label="Invested" value={inr(newInvested)} />
                                    <PreviewCell label="Avg cost" value={inr(newAvgCost)} />
                                </div>
                            </div>
                        </>
                    )}

                    <SheetFooter className="mt-auto flex-row gap-2 border-t pt-4">
                        <SheetClose asChild>
                            <Button variant="outline" type="button" disabled={mutation.isPending}>
                                Cancel
                            </Button>
                        </SheetClose>
                        <Button
                            type="submit"
                            disabled={mutation.isPending || qty <= 0 || price <= 0}
                            className="flex-1"
                        >
                            {mutation.isPending
                                ? "Recording…"
                                : isAddMode
                                  ? "Add holding"
                                  : "Record BUY"}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}

function FormField({
    label,
    hint,
    error,
    children,
}: {
    label: string;
    hint?: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {label}
            </Label>
            {children}
            {hint && !error && (
                <p className="text-xs text-muted-foreground">{hint}</p>
            )}
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}

function PreviewCell({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-mono">{value}</p>
        </div>
    );
}
