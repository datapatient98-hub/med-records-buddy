import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: "cyan" | "pink" | "green" | "purple" | "orange";
  stats?: {
    label: string;
    value: number;
  }[];
  className?: string;
}

const colorClasses = {
  cyan: "from-cyan/80 to-cyan",
  pink: "from-pink/80 to-pink",
  green: "from-green/80 to-green",
  purple: "from-purple/80 to-purple",
  orange: "from-orange/80 to-orange",
};

export default function DashboardCard({
  title,
  value,
  icon: Icon,
  color,
  stats,
  className,
}: DashboardCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden shadow-xl border-0",
        `bg-gradient-to-br ${colorClasses[color]}`,
        className
      )}
    >
      <div className="p-6 text-white">
        {/* Icon */}
        <div className="flex items-center justify-between mb-4">
          <Icon className="h-10 w-10 opacity-90" />
        </div>

        {/* Title and Value */}
        <div className="space-y-1 mb-4">
          <h3 className="text-sm font-medium opacity-90">{title}</h3>
          <p className="text-4xl font-bold">{value}</p>
        </div>

        {/* Stats */}
        {stats && stats.length > 0 && (
          <div className="flex gap-4 pt-4 border-t border-white/20">
            {stats.map((stat, idx) => (
              <div key={idx} className="flex-1">
                <p className="text-xs opacity-80">{stat.label}</p>
                <p className="text-lg font-semibold">{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10">
        <div className="absolute top-4 left-4 w-32 h-32 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-4 right-4 w-24 h-24 bg-white rounded-full blur-2xl" />
      </div>
    </Card>
  );
}