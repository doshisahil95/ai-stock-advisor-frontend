"use client";

import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { Holding } from "@/lib/api";
import { colorForChange, inr, inrSigned, pct } from "@/lib/format";

interface HoldingsTableProps {
    holdings: Holding[];
}

type SortKey =
    | "symbol"
    | "quantity"
    | "avg_cost"
    | "current_price"
    | "invested_amount"
    | "current_value"
    | "unrealized_pnl"
    | "unrealized_pnl_pct"
    | "day_gain_pct";

type SortDir = "asc" | "desc";

const HEADERS: { key: SortKey; label: string; align: "left" | "right" }[] = [
    { key: "symbol", label: "Symbol", align: "left" },
    { key: "quantity", label: "Qty", align: "right" },
    { key: "avg_cost", label: "Avg Cost", align: "right" },
    { key: "current_price", label: "Price", align: "right" },
    { key: "day_gain_pct", label: "Day %", align: "right" },
    { key: "invested_amount", label: "Invested", align: "right" },
    { key: "current_value", label: "Current", align: "right" },
    { key: "unrealized_pnl", label: "P&L", align: "right" },
    { key: "unrealized_pnl_pct", label: "P&L %", align: "right" },
];

function getValue(h: Holding, key: SortKey): number | string {
    // We use any to handle the str-vs-number coercion of Decimals in the API
    const raw = (h as unknown as Record<string, unknown>)[key];
    if (raw === null || raw === undefined) return -Infinity;
    if (typeof raw === "string") {
        const n = parseFloat(raw);
        return Number.isFinite(n) ? n : raw;
    }
    return raw as number;
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>("current_value");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const router = useRouter();

    const sorted = useMemo(() => {
        const copy = [...holdings];
        copy.sort((a, b) => {
            const av = getValue(a, sortKey);
            const bv = getValue(b, sortKey);
            const cmp =
                typeof av === "number" && typeof bv === "number"
                    ? av - bv
                    : String(av).localeCompare(String(bv));
            return sortDir === "asc" ? cmp : -cmp;
        });
        return copy;
    }, [holdings, sortKey, sortDir]);

    const handleSort = (key: SortKey) => {
        if (key === sortKey) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir(key === "symbol" ? "asc" : "desc");
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Holdings ({holdings.length})</CardTitle>
                <CardDescription>
                    Click any column header to sort. Default: highest current value first.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {HEADERS.map((h) => (
                                    <TableHead
                                        key={h.key}
                                        className={`cursor-pointer select-none whitespace-nowrap text-xs uppercase tracking-wider ${h.align === "right" ? "text-right" : "text-left"
                                            }`}
                                        onClick={() => handleSort(h.key)}
                                    >
                                        <span
                                            className={`inline-flex items-center gap-1 ${h.align === "right" ? "justify-end" : ""
                                                }`}
                                        >
                                            {h.label}
                                            <SortIcon active={sortKey === h.key} dir={sortDir} />
                                        </span>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sorted.map((h) => (
                                <TableRow
                                    key={h.isin}
                                    className="cursor-pointer hover:bg-accent/40"
                                    onClick={() => router.push(`/holdings/${h.isin}`)}
                                >
                                    <TableCell className="font-mono font-medium">
                                        {h.symbol}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        {h.quantity}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm">
                                        {inr(h.avg_cost)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm">
                                        {inr(h.current_price)}
                                    </TableCell>
                                    <TableCell
                                        className={`text-right font-mono text-sm ${colorForChange(
                                            h.day_gain_pct
                                        )}`}
                                    >
                                        {pct(h.day_gain_pct)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm">
                                        {inr(h.invested_amount)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm font-medium">
                                        {inr(h.current_value)}
                                    </TableCell>
                                    <TableCell
                                        className={`text-right font-mono text-sm ${colorForChange(
                                            h.unrealized_pnl
                                        )}`}
                                    >
                                        {inrSigned(h.unrealized_pnl)}
                                    </TableCell>
                                    <TableCell
                                        className={`text-right font-mono text-sm font-medium ${colorForChange(
                                            h.unrealized_pnl_pct
                                        )}`}
                                    >
                                        {pct(h.unrealized_pnl_pct)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
    if (!active) {
        return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    }
    return dir === "asc" ? (
        <ArrowUp className="h-3 w-3" />
    ) : (
        <ArrowDown className="h-3 w-3" />
    );
}