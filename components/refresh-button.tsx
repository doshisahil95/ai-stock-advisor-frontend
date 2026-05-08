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
            queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
            queryClient.invalidateQueries({ queryKey: ["reconciliation"] }),
            queryClient.invalidateQueries({ queryKey: ["cost-basis"] }),
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