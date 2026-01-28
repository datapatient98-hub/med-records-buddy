import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type AuditSummary = {
  totalChanges: number;
  topFields: { field: string; count: number }[];
};

export default function DashboardAuditSummary({
  summary,
}: {
  summary: AuditSummary;
}) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-foreground">ملخص التعديلات (Audit)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
          <span className="text-sm text-muted-foreground">عدد التعديلات</span>
          <span className="text-lg font-semibold text-foreground">{summary.totalChanges}</span>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground mb-2">أكثر الحقول تعديلًا</p>
          {summary.topFields.length ? (
            <ul className="space-y-1">
              {summary.topFields.slice(0, 5).map((f) => (
                <li
                  key={f.field}
                  className="flex items-center justify-between text-sm rounded-md border border-border px-3 py-2"
                >
                  <span className="text-muted-foreground">{f.field}</span>
                  <span className="font-semibold text-foreground">{f.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">لا توجد تعديلات ضمن الفترة.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
