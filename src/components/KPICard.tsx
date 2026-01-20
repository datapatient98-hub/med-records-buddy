import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPICardProps {
  title: string;
  value: number;
  previousValue?: number;
  format?: "number" | "percentage";
  colorScheme?: "cyan" | "pink" | "green" | "purple" | "orange";
}

export default function KPICard({
  title,
  value,
  previousValue,
  format = "number",
  colorScheme = "cyan",
}: KPICardProps) {
  const calculateChange = () => {
    if (previousValue === undefined || previousValue === 0) return null;
    const change = ((value - previousValue) / previousValue) * 100;
    return change;
  };

  const change = calculateChange();
  const isPositive = change !== null && change > 0;
  const isNegative = change !== null && change < 0;
  const isNeutral = change === null || change === 0;

  const colorClasses = {
    cyan: "from-cyan/10 to-cyan/5 border-cyan/30",
    pink: "from-pink/10 to-pink/5 border-pink/30",
    green: "from-green/10 to-green/5 border-green/30",
    purple: "from-purple/10 to-purple/5 border-purple/30",
    orange: "from-orange/10 to-orange/5 border-orange/30",
  };

  const textColorClasses = {
    cyan: "text-cyan",
    pink: "text-pink",
    green: "text-green",
    purple: "text-purple",
    orange: "text-orange",
  };

  return (
    <Card
      className={cn(
        "shadow-lg bg-gradient-to-br border-2",
        colorClasses[colorScheme]
      )}
    >
      <CardContent className="p-6">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>

          <div className="flex items-baseline justify-between">
            <p className={cn("text-4xl font-bold", textColorClasses[colorScheme])}>
              {format === "percentage" ? `${value.toFixed(1)}%` : value.toLocaleString()}
            </p>

            {change !== null && (
              <div
                className={cn(
                  "flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-full",
                  isPositive && "bg-green/10 text-green",
                  isNegative && "bg-destructive/10 text-destructive",
                  isNeutral && "bg-muted text-muted-foreground"
                )}
              >
                {isPositive && <TrendingUp className="h-4 w-4" />}
                {isNegative && <TrendingDown className="h-4 w-4" />}
                {isNeutral && <Minus className="h-4 w-4" />}
                <span>{Math.abs(change).toFixed(1)}%</span>
              </div>
            )}
          </div>

          {previousValue !== undefined && (
            <p className="text-xs text-muted-foreground">
              السابق: {format === "percentage" ? `${previousValue.toFixed(1)}%` : previousValue.toLocaleString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
