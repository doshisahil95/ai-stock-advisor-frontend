"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Theme toggle — light / dark / system.
 *
 * Uses next-themes for SSR-safe persistence. Defaults to "system" so first-load
 * matches the OS preference; user choice persists thereafter.
 */
export function ThemeToggle() {
    const { setTheme, theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Avoid hydration mismatch — only render after client mount
    useEffect(() => setMounted(true), []);
    if (!mounted) {
        // Render a placeholder of the same size to prevent layout shift
        return <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled />;
    }

    const Icon =
        theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" aria-label="Toggle theme">
                    <Icon className="h-3.5 w-3.5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun className="mr-2 h-3.5 w-3.5" />
                    Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon className="mr-2 h-3.5 w-3.5" />
                    Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Monitor className="mr-2 h-3.5 w-3.5" />
                    System
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}