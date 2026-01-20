import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparklines, SparklinesLine } from "react-sparklines";

interface ColoredStatTabProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: LucideIcon;
  color: "cyan" | "pink" | "green" | "purple" | "orange";
  sparklineData?: number[];
  onClick?: () => void;
  active?: boolean;
}

const colorClasses = {
  cyan: "bg-gradient-to-br from-cyan-500 to-cyan-600 text-white",
  pink: "bg-gradient-to-br from-pink-500 to-pink-600 text-white",
  green: "bg-gradient-to-br from-green-500 to-green-600 text-white",
  purple: "bg-gradient-to-br from-purple-500 to-purple-600 text-white",
  orange: "bg-gradient-to-br from-orange-500 to-orange-600 text-white",
};

export default function ColoredStatTab({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  sparklineData,
  onClick,
  active,
}: ColoredStatTabProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:scale-105 ${colorClasses[color]} ${
        active ? "ring-2 ring-white ring-offset-2" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium opacity-90">{title}</p>
          </div>
          <Icon className="h-6 w-6 opacity-90" />
        </div>
        
        <div className="space-y-2">
          <p className="text-4xl font-bold">{value.toLocaleString("ar-EG")}</p>
          
          {subtitle && (
            <p className="text-xs opacity-80">{subtitle}</p>
          )}
          
          {sparklineData && sparklineData.length > 0 && (
            <div className="mt-3 opacity-80">
              <Sparklines data={sparklineData} height={30} margin={2}>
                <SparklinesLine color="white" style={{ strokeWidth: 2, fill: "none" }} />
              </Sparklines>
              <p className="text-xs mt-1">آخر 7 أيام</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
