"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
    const [client] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000, // 1 min — most data doesn't change minute-to-minute
                        refetchOnWindowFocus: false, // we have an explicit refresh button
                        retry: 1,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={client}>
            <TooltipProvider>{children}</TooltipProvider>
            {process.env.NODE_ENV === "development" && (
                <ReactQueryDevtools initialIsOpen={false} />
            )}
        </QueryClientProvider>
    );
}