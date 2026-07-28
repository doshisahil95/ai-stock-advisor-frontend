"use client";

import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function RefreshButton() {
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            queryClient.refetchQueries({ queryKey: ["dashboard"] }),
            queryClient.refetchQueries({ queryKey: ["reconciliation"] }),
            queryClient.refetchQueries({ queryKey: ["cost-basis"] }),
            // #79 U8-e: include holding/transactions so a manual refresh is
            // complete if this button is ever reused off the dashboard (no-op
            // on the dashboard, where those keys aren't mounted).
            queryClient.refetchQueries({ queryKey: ["holding"] }),
            queryClient.refetchQueries({ queryKey: ["transactions"] }),
        ]);
        setTimeout(() => setRefreshing(false), 600);
    };

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="h-8 gap-1.5"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p className="max-w-xs text-xs">
                    Re-reads latest data from the API. Prices auto-refresh every 15 min during market hours.
                </p>
            </TooltipContent>
        </Tooltip>
    );
}