import * as React from "react";

import { format, startOfMonth, startOfWeek, subDays, startOfYear, differenceInCalendarDays } from "date-fns";
import { ar } from "date-fns/locale";
import { CalendarDays, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PeriodType = "today" | "week" | "month" | "quarter" | "year";

export type DateRangeValue = {
  from: string; // yyyy-MM-dd
  to: string; // yyyy-MM-dd
};

function toLabel(from: string, to: string) {
  try {
    const fromD = new Date(from);
    const toD = new Date(to);
    if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) return "";
    return `${format(fromD, "dd MMM yyyy", { locale: ar })} — ${format(toD, "dd MMM yyyy", { locale: ar })}`;
  } catch {
    return "";
  }
}

function periodToRange(period: PeriodType) {
  const now = new Date();
  switch (period) {
    case "today":
      return { from: format(now, "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd"), label: "اليوم" };
    case "week":
      return { from: format(startOfWeek(now), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd"), label: "آخر أسبوع" };
    case "month":
      return { from: format(startOfMonth(now), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd"), label: "هذا الشهر" };
    case "quarter":
      return { from: format(subDays(now, 90), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd"), label: "آخر 3 أشهر" };
    case "year":
      return { from: format(startOfYear(now), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd"), label: "هذا العام" };
  }
}

export default function DashboardProfessionalDateRangeCard(props: {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  period: PeriodType;
  onPeriodChange: (p: PeriodType) => void;
  className?: string;
  title?: string;
  resetTo?: PeriodType;
}) {
  const {
    value,
    onChange,
    period,
    onPeriodChange,
    className,
    title = "الفترة الزمنية",
    resetTo = "month",
  } = props;

  const [draft, setDraft] = React.useState<DateRangeValue>(value);

  React.useEffect(() => {
    setDraft(value);
  }, [value.from, value.to]);

  const canApply = Boolean(draft.from) && Boolean(draft.to) && draft.from <= draft.to;
  const label = toLabel(draft.from, draft.to);

  const days = React.useMemo(() => {
    try {
      const fromD = new Date(draft.from);
      const toD = new Date(draft.to);
      if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) return null;
      return Math.max(1, differenceInCalendarDays(toD, fromD) + 1);
    } catch {
      return null;
    }
  }, [draft.from, draft.to]);

  const presets: { key: PeriodType; label: string }[] = [
    { key: "today", label: "اليوم" },
    { key: "week", label: "الأسبوع" },
    { key: "month", label: "الشهر" },
    { key: "quarter", label: "3 أشهر" },
    { key: "year", label: "السنة" },
  ];

  return (
    <Card className={cn("border-border bg-card/50 backdrop-blur", className)}>
      <div className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">{title}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              استخدم الفترات السريعة أو حدّد (من/إلى) ثم اضغط تطبيق — تؤثر على كل الإحصائيات.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {typeof days === "number" ? <Badge variant="secondary">{days} يوم</Badge> : null}
              {label ? <Badge variant="outline">{label}</Badge> : null}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => {
                  const next = periodToRange(resetTo);
                  onPeriodChange(resetTo);
                  setDraft({ from: next.from, to: next.to });
                  onChange({ from: next.from, to: next.to });
                }}
              >
                <RotateCcw className="ml-1 h-3.5 w-3.5" />
                إعادة ضبط
              </Button>
            </div>
          </div>

          <div className="w-full space-y-3 md:w-auto">
            {/* Quick presets */}
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <Button
                  key={p.key}
                  type="button"
                  size="sm"
                  variant={period === p.key ? "default" : "outline"}
                  onClick={() => {
                    onPeriodChange(p.key);
                    const next = periodToRange(p.key);
                    setDraft({ from: next.from, to: next.to });
                    onChange({ from: next.from, to: next.to });
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            {/* Date inputs + apply */}
            <div className="grid gap-2 md:grid-cols-3 md:items-end">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">من</label>
                <Input
                  type="date"
                  value={draft.from}
                  onChange={(e) => setDraft((prev) => ({ ...prev, from: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">إلى</label>
                <Input
                  type="date"
                  value={draft.to}
                  onChange={(e) => setDraft((prev) => ({ ...prev, to: e.target.value }))}
                />
              </div>

              <Button
                type="button"
                className="md:mt-0"
                disabled={!canApply}
                onClick={() => {
                  onChange(draft);
                }}
              >
                تطبيق
              </Button>
            </div>

            {!canApply && (draft.from || draft.to) ? (
              <p className="text-xs text-destructive">تأكد أن (من) و(إلى) مُحددين وأن (من) ≤ (إلى).</p>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
