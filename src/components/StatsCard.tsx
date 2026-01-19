import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export default function StatsCard({
  title,
  value,
  icon,
  trend,
  className,
}: StatsCardProps) {
  return (
    <Card className={cn("shadow-medical", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {trend && (
          <p
            className={cn(
              "text-xs mt-1",
              trend.isPositive ? "text-success" : "text-destructive"
            )}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value}% من الشهر الماضي
          </p>
        )}
      </CardContent>
    </Card>
  );
}