"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, TrendingDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { api, ApiError, isFullExit, type Holding } from "@/lib/api";
import { colorForChange, inr, inrSigned } from "@/lib/format";

const today = () => new Date().toISOString().split("T")[0];

const formSchema = z.object({
    quantity: z.coerce.number().positive("Must be positive"),
    price: z.coerce.number().positive("Must be positive"),
    fees: z.coerce.number().min(0, "Cannot be negative").default(0),
    trade_date: z.string().min(1, "Required"),
});

interface SellSheetProps {
    holding: Holding;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SellSheet({ holding, open, onOpenChange }: SellSheetProps) {
    const queryClient = useQueryClient();
    const router = useRouter();
    const [confirmOpen, setConfirmOpen] = useState(false);

    const currentPrice = holding.current_price ? parseFloat(holding.current_price) : 0;
    const availableQty = parseFloat(holding.quantity);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            quantity: 0,
            price: currentPrice,
            fees: 0,
            trade_date: today(),
        },
    });

    useEffect(() => {
        if (open) {
            // Force fresh holding data when sheet opens — avoids stale availableQty
            queryClient.refetchQueries({ queryKey: ["holding", holding.isin] });
            form.reset({
                quantity: 0,
                price: currentPrice,
                fees: 0,
                trade_date: today(),
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const qty = Number(form.watch("quantity")) || 0;
    const price = Number(form.watch("price")) || 0;
    const tradeDate = form.watch("trade_date");

    // Live FIFO preview from backend
    const previewQuery = useQuery({
        queryKey: ["sell-preview", holding.isin, qty, price],
        queryFn: () =>
            api.previewSell(holding.isin, {
                quantity: qty.toString(),
                price: price.toString(),
                total_fees: "0",
                trade_date: new Date(tradeDate || today()).toISOString(),
            }),
        enabled: qty > 0 && price > 0 && qty <= availableQty,
        staleTime: 5000,
    });

    const sellMutation = useMutation({
        mutationFn: (values: z.output<typeof formSchema>) =>
            api.recordSell(holding.isin, {
                quantity: values.quantity.toString(),
                price: values.price.toString(),
                total_fees: values.fees.toString(),
                trade_date: new Date(values.trade_date).toISOString(),
            }),
        onSuccess: async (response) => {
            const fullyExited = isFullExit(response);

            // Force-refetch all dependent queries before showing toast
            await Promise.all([
                queryClient.refetchQueries({ queryKey: ["holding", holding.isin] }),
                queryClient.refetchQueries({ queryKey: ["transactions", holding.isin] }),
                queryClient.refetchQueries({ queryKey: ["dashboard"] }),
                queryClient.refetchQueries({ queryKey: ["reconciliation"] }),
            ]);

            onOpenChange(false);
            setConfirmOpen(false);

            if (fullyExited) {
                toast.success(`Position closed — realized ${inrSigned(response.realized_total)}`, {
                    description: "This holding no longer exists. Returning to dashboard.",
                });
                // Brief delay so toast renders before navigation
                setTimeout(() => router.push("/"), 1200);
            } else {
                // response is the updated Holding doc
                toast.success(`Sold ${qty} ${holding.symbol} at ${inr(price)}`, {
                    description: `${response.quantity} shares remaining`,
                });
            }
        },
        onError: (err: Error) => {
            const message = err instanceof ApiError ? err.detail : err.message;
            toast.error("Sell failed", { description: message });
            setConfirmOpen(false);
        },
    });

    const preview = previewQuery.data;
    const previewValid = preview?.valid;
    const realizedPnl = preview?.realized_pnl ? parseFloat(preview.realized_pnl) : null;
    const willFullyExit = preview?.fully_exits === true;

    const handleSubmit = form.handleSubmit(() => {
        setConfirmOpen(true);
    });

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="flex flex-col gap-6 overflow-y-auto sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-500" />
                            Sell {holding.symbol}
                        </SheetTitle>
                        <SheetDescription>
                            Currently hold {availableQty} shares at avg {inr(holding.avg_cost)}.
                            Current price: <span className="font-mono">{inr(currentPrice)}</span>
                        </SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 px-4">
                        <FormField
                            label="Quantity"
                            hint={`Maximum ${availableQty} available`}
                            error={
                                form.formState.errors.quantity?.message ||
                                (qty > availableQty ? `Cannot exceed ${availableQty}` : undefined)
                            }
                        >
                            <Input
                                type="number"
                                step="1"
                                max={availableQty}
                                placeholder="10"
                                {...form.register("quantity")}
                            />
                        </FormField>

                        <FormField
                            label="Price per share (₹)"
                            hint="Pre-filled with current market price"
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

                        {/* Live FIFO preview */}
                        {qty > 0 && price > 0 && qty <= availableQty && (
                            <>
                                <Separator />
                                {previewQuery.isLoading && (
                                    <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                                        Computing preview…
                                    </div>
                                )}
                                {previewValid && (
                                    <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
                                        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            Preview (FIFO)
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                            <PreviewCell
                                                label="Realized P&L"
                                                value={inrSigned(preview?.realized_pnl ?? "0")}
                                                valueClassName={colorForChange(realizedPnl)}
                                            />
                                            <PreviewCell
                                                label="Remaining qty"
                                                value={`${preview?.remaining_qty ?? "0"}`}
                                            />
                                            {!willFullyExit && (
                                                <>
                                                    <PreviewCell
                                                        label="Remaining invested"
                                                        value={inr(preview?.remaining_invested ?? "0")}
                                                    />
                                                    <PreviewCell
                                                        label="Remaining avg cost"
                                                        value={inr(preview?.remaining_avg_cost ?? "0")}
                                                    />
                                                </>
                                            )}
                                        </div>
                                        {willFullyExit && (
                                            <p className="rounded-sm bg-amber-100 px-2 py-1 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                                                ⚠️ This SELL closes the position. The dashboard will redirect after.
                                            </p>
                                        )}
                                    </div>
                                )}
                                {previewQuery.data && !previewValid && (
                                    <div className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                                        {previewQuery.data.error ?? "Invalid sell"}
                                    </div>
                                )}
                            </>
                        )}

                        <SheetFooter className="mt-auto flex-row gap-2 border-t pt-4">
                            <SheetClose asChild>
                                <Button variant="outline" type="button" disabled={sellMutation.isPending}>
                                    Cancel
                                </Button>
                            </SheetClose>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={
                                    sellMutation.isPending ||
                                    qty <= 0 ||
                                    price <= 0 ||
                                    qty > availableQty ||
                                    !previewValid
                                }
                                className="flex-1"
                            >
                                Review SELL
                            </Button>
                        </SheetFooter>
                    </form>
                </SheetContent>
            </Sheet>

            {/* Confirm dialog */}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Confirm SELL: {qty} {holding.symbol} @ {inr(price)}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <span className="block">
                                You&apos;re about to record a SELL transaction. This will:
                            </span>
                            <ul className="ml-4 list-disc space-y-0.5 text-sm">
                                <li>Apply FIFO depletion to your oldest BUY lots</li>
                                <li>
                                    Realize <span className={colorForChange(realizedPnl)}>
                                        {inrSigned(preview?.realized_pnl ?? "0")}
                                    </span> in P&L
                                </li>
                                {willFullyExit ? (
                                    <li className="text-amber-700 dark:text-amber-400">
                                        Close the position entirely (you&apos;ll return to the dashboard)
                                    </li>
                                ) : (
                                    <li>
                                        Leave you with {preview?.remaining_qty} shares at avg{" "}
                                        {inr(preview?.remaining_avg_cost ?? "0")}
                                    </li>
                                )}
                            </ul>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={sellMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={sellMutation.isPending}
                            onClick={() => {
                                const v = form.getValues();
                                sellMutation.mutate({
                                    quantity: Number(v.quantity),
                                    price: Number(v.price),
                                    fees: Number(v.fees) || 0,
                                    trade_date: v.trade_date,
                                });
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {sellMutation.isPending ? "Recording…" : "Confirm SELL"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
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

function PreviewCell({
    label,
    value,
    valueClassName,
}: {
    label: string;
    value: string;
    valueClassName?: string;
}) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`font-mono ${valueClassName ?? ""}`}>{value}</p>
        </div>
    );
}