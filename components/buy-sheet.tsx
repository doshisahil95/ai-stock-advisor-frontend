"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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

interface BuySheetProps {
    holding: Holding;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function BuySheet({ holding, open, onOpenChange }: BuySheetProps) {
    const queryClient = useQueryClient();
    const currentPrice = holding.current_price ? parseFloat(holding.current_price) : 0;

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

    // Reset form when sheet opens or current price changes
    useEffect(() => {
        if (open) {
            form.reset({
                quantity: 0,
                price: currentPrice,
                fees: 0,
                trade_date: today(),
                notes: "",
            });
        }
    }, [open, currentPrice, form]);

    // Live preview of new average cost
    const qty = Number(form.watch("quantity")) || 0;
    const price = Number(form.watch("price")) || 0;
    const fees = Number(form.watch("fees")) || 0;

    const existingQty = parseFloat(holding.quantity);
    const existingInvested = parseFloat(holding.invested_amount);
    const newQty = existingQty + qty;
    const newInvested = existingInvested + qty * price + fees;
    const newAvgCost = newQty > 0 ? newInvested / newQty : 0;

    const mutation = useMutation({
        mutationFn: (values: z.output<typeof formSchema>) =>
            api.recordBuy({
                symbol: holding.symbol,
                exchange: holding.exchange,
                quantity: values.quantity.toString(),
                price: values.price.toString(),
                fees: values.fees.toString(),
                trade_date: new Date(values.trade_date).toISOString(),
            }),
        onSuccess: (updated) => {
            toast.success(
                `Recorded BUY of ${qty} ${holding.symbol} at ₹${price}`,
                { description: `New avg cost: ${inr(updated.avg_cost)}` }
            );
            queryClient.invalidateQueries({ queryKey: ["holding", holding.isin] });
            queryClient.invalidateQueries({ queryKey: ["transactions", holding.isin] });
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            queryClient.invalidateQueries({ queryKey: ["reconciliation"] });
            onOpenChange(false);
        },
        onError: (err: Error) => {
            const message = err instanceof ApiError ? err.detail : err.message;
            toast.error("Buy failed", { description: message });
        },
    });

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col gap-6 overflow-y-auto sm:max-w-md">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                        Buy more {holding.symbol}
                    </SheetTitle>
                    <SheetDescription>
                        Currently hold {existingQty} shares at avg {inr(holding.avg_cost)}.
                        Current price: <span className="font-mono">{inr(currentPrice)}</span>
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
                            step="1"
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
                                    After this BUY
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
                            {mutation.isPending ? "Recording…" : `Record BUY`}
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