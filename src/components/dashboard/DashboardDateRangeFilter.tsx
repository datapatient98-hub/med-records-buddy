import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type DateRangeValue = {
  from: string; // yyyy-MM-dd
  to: string; // yyyy-MM-dd
};

export default function DashboardDateRangeFilter({
  value,
  onChange,
  className,
  title = "الفترة الزمنية",
}: {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  className?: string;
  title?: string;
}) {
  const [draft, setDraft] = React.useState<DateRangeValue>(value);

  React.useEffect(() => {
    setDraft(value);
  }, [value.from, value.to]);

  const canApply = Boolean(draft.from) && Boolean(draft.to) && draft.from <= draft.to;

  return (
    <Card className={cn("border-border bg-card/50 backdrop-blur", className)}>
      <div className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">
              اختر (من تاريخ) و(إلى تاريخ) — يتم تطبيقها على كل الإحصائيات.
            </p>
          </div>

          <div className="grid gap-2 md:grid-cols-3 md:items-end">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">من</label>
              <Input
                type="date"
                value={draft.from}
                onChange={(e) => setDraft((p) => ({ ...p, from: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">إلى</label>
              <Input
                type="date"
                value={draft.to}
                onChange={(e) => setDraft((p) => ({ ...p, to: e.target.value }))}
              />
            </div>
            <Button
              className="md:mt-0"
              disabled={!canApply}
              onClick={() => onChange(draft)}
            >
              تطبيق
            </Button>
          </div>
        </div>

        {!canApply && (draft.from || draft.to) ? (
          <p className="mt-2 text-xs text-destructive">
            تأكد أن (من) و(إلى) مُحددين وأن (من) ≤ (إلى).
          </p>
        ) : null}
      </div>
    </Card>
  );
}
