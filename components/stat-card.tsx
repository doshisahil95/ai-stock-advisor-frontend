import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string;
    subValue?: string;
    subValueClassName?: string;
    icon?: LucideIcon;
    className?: string;
}

export function StatCard({
    title,
    value,
    subValue,
    subValueClassName,
    icon: Icon,
    className,
}: StatCardProps) {
    return (
        <Card className={cn("transition-shadow hover:shadow-md", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
                <div className="font-mono text-2xl font-bold tracking-tight">{value}</div>
                {subValue && (
                    <p className={cn("mt-1 font-mono text-xs", subValueClassName)}>
                        {subValue}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}