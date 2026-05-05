"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { dateShort, inr, inrCompact } from "@/lib/format";

interface PriceChartProps {
    isin: string;
    symbol: string;
}

const TIMEFRAMES = [
    { label: "1M", days: 30 },
    { label: "3M", days: 90 },
    { label: "6M", days: 180 },
    { label: "1Y", days: 365 },
    { label: "5Y", days: 1825 },
] as const;

export function PriceChart({ isin, symbol }: PriceChartProps) {
    const [days, setDays] = useState<number>(90);

    const { data, isLoading, error } = useQuery({
        queryKey: ["price-history", isin, days],
        queryFn: () => api.getHoldingHistory(isin, days),
    });

    const chartData = (data ?? []).map((bar) => ({
        date: bar.date,
        close: parseFloat(bar.close),
        high: parseFloat(bar.high),
        low: parseFloat(bar.low),
    }));

    const firstClose = chartData[0]?.close;
    const lastClose = chartData[chartData.length - 1]?.close;
    const periodChange =
        firstClose && lastClose ? ((lastClose - firstClose) / firstClose) * 100 : null;
    const isUp = (periodChange ?? 0) >= 0;
    const strokeColor = isUp ? "#10b981" : "#ef4444"; // emerald / red
    const fillId = `priceGradient-${isin}`;

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <CardTitle>Price History</CardTitle>
                        <CardDescription>
                            {symbol} closing prices · last {days} days
                            {periodChange !== null && (
                                <span
                                    className={`ml-2 font-mono ${isUp ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500"
                                        }`}
                                >
                                    {isUp ? "+" : ""}
                                    {periodChange.toFixed(2)}%
                                </span>
                            )}
                        </CardDescription>
                    </div>
                    <div className="flex gap-1">
                        {TIMEFRAMES.map((tf) => (
                            <Button
                                key={tf.label}
                                size="sm"
                                variant={days === tf.days ? "secondary" : "ghost"}
                                className="h-7 px-2 text-xs"
                                onClick={() => setDays(tf.days)}
                            >
                                {tf.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading && <Skeleton className="h-[280px] w-full" />}
                {error && (
                    <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                        Couldn&apos;t load price history.
                    </div>
                )}
                {data && data.length === 0 && (
                    <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                        No price data yet for this stock.
                    </div>
                )}
                {chartData.length > 0 && (
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                                <defs>
                                    <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(d) => dateShort(d)}
                                    tick={{ fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    minTickGap={40}
                                />
                                <YAxis
                                    tickFormatter={(v: number) => inrCompact(v)}
                                    tick={{ fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={56}
                                    domain={["dataMin", "dataMax"]}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--background))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: 6,
                                        fontSize: 12,
                                    }}
                                    labelFormatter={(d) => dateShort(d as string)}
                                    formatter={(value) => [inr(typeof value === "number" ? value : Number(value)), "Close"]}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="close"
                                    stroke={strokeColor}
                                    strokeWidth={2}
                                    fill={`url(#${fillId})`}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}