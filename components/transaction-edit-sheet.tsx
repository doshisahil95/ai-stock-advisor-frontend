"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, Pencil } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { api, ApiError, type Transaction } from "@/lib/api";

const today = () => new Date().toISOString().split("T")[0];

const formSchema = z.object({
    quantity: z.coerce.number().positive("Must be positive"),
    price: z.coerce.number().positive("Must be positive"),
    trade_date: z.string().min(1, "Required"),
    total_fees: z.coerce.number().min(0, "Cannot be negative"),
    notes: z.string().max(500).optional(),
    reason: z.string().min(3, "Reason required (at least 3 chars)").max(500),
});

interface EditSheetProps {
    transaction: Transaction;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TransactionEditSheet({ transaction, open, onOpenChange }: EditSheetProps) {
    const queryClient = useQueryClient();

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            quantity: parseFloat(transaction.quantity),
            price: parseFloat(transaction.price),
            trade_date: transaction.trade_date.split("T")[0],
            total_fees: parseFloat(transaction.total_fees),
            notes: transaction.notes ?? "",
            reason: "",
        },
    });

    // Reset form when sheet opens
    useEffect(() => {
        if (open) {
            form.reset({
                quantity: parseFloat(transaction.quantity),
                price: parseFloat(transaction.price),
                trade_date: transaction.trade_date.split("T")[0],
                total_fees: parseFloat(transaction.total_fees),
                notes: transaction.notes ?? "",
                reason: "",
            });
        }
    }, [open, transaction, form]);

    const mutation = useMutation({
        mutationFn: (values: z.output<typeof formSchema>) =>
            api.editTransaction(transaction._id, {
                quantity: values.quantity.toString(),
                price: values.price.toString(),
                trade_date: new Date(values.trade_date).toISOString(),
                total_fees: values.total_fees.toString(),
                notes: values.notes,
                reason: values.reason,
            }),
        onSuccess: async () => {
            await Promise.all([
                queryClient.refetchQueries({ queryKey: ["transactions"] }),
                queryClient.refetchQueries({ queryKey: ["holding", transaction.isin] }),
                queryClient.refetchQueries({ queryKey: ["dashboard"] }),
            ]);
            toast.success(`Updated ${transaction.symbol} ${transaction.type}`, {
                description: "Holding recomputed.",
            });
            onOpenChange(false);
        },
        onError: (err: Error) => {
            const message = err instanceof ApiError ? err.detail : err.message;
            toast.error("Edit failed", { description: message });
        },
    });

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col gap-6 overflow-y-auto sm:max-w-md">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Pencil className="h-5 w-5" />
                        Edit transaction
                    </SheetTitle>
                    <SheetDescription>
                        {transaction.symbol} · {transaction.type} ·{" "}
                        {new Date(transaction.trade_date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            timeZone: "Asia/Kolkata",
                        })}
                        <br />
                        <span className="text-amber-600 dark:text-amber-400">
                            ⚠️ Editing changes recomputed P&L. Audit log will record this change.
                        </span>
                    </SheetDescription>
                </SheetHeader>

                <form
                    onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
                    className="flex flex-1 flex-col gap-5 px-4"
                >
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Quantity" error={form.formState.errors.quantity?.message}>
                            <Input type="number" step="0.0001" {...form.register("quantity")} />
                        </FormField>
                        <FormField label="Price (₹)" error={form.formState.errors.price?.message}>
                            <Input type="number" step="0.01" {...form.register("price")} />
                        </FormField>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Trade date" error={form.formState.errors.trade_date?.message}>
                            <div className="relative">
                                <Input type="date" max={today()} {...form.register("trade_date")} />
                                <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            </div>
                        </FormField>
                        <FormField label="Fees (₹)" error={form.formState.errors.total_fees?.message}>
                            <Input type="number" step="0.01" {...form.register("total_fees")} />
                        </FormField>
                    </div>

                    <FormField label="Notes (optional)" error={form.formState.errors.notes?.message}>
                        <Textarea rows={2} {...form.register("notes")} />
                    </FormField>

                    <Separator />

                    <FormField
                        label="Reason for edit"
                        hint="Why are you changing this? (audit trail)"
                        error={form.formState.errors.reason?.message}
                    >
                        <Textarea
                            rows={2}
                            placeholder="e.g. Fixing typo in price"
                            {...form.register("reason")}
                        />
                    </FormField>

                    <SheetFooter className="mt-auto flex-row gap-2 border-t pt-4">
                        <SheetClose asChild>
                            <Button variant="outline" type="button" disabled={mutation.isPending}>
                                Cancel
                            </Button>
                        </SheetClose>
                        <Button type="submit" disabled={mutation.isPending} className="flex-1">
                            {mutation.isPending ? "Saving…" : "Save changes"}
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
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
            {children}
            {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}