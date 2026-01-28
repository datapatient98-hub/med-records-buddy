import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type QualityScore = {
  label: string;
  percent: number;
  countBad: number;
  countTotal: number;
};

export type QualityTopIssue = {
  id: string;
  label: string;
  count: number;
};

export default function DashboardQualityScorecard({
  scores,
  topIssues,
}: {
  scores: QualityScore[];
  topIssues: QualityTopIssue[];
}) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-foreground">جودة البيانات</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {scores.map((s) => (
            <div
              key={s.label}
              className="rounded-md border border-border bg-muted/40 px-3 py-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <span className="text-sm font-semibold text-foreground">
                  {Number.isFinite(s.percent) ? `${s.percent.toFixed(0)}%` : "-"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                أخطاء: {s.countBad} / {s.countTotal}
              </p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-sm font-medium text-foreground mb-2">أكثر الأخطاء تكرارًا</p>
          {topIssues.length ? (
            <ul className="space-y-1">
              {topIssues.slice(0, 5).map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between text-sm rounded-md border border-border px-3 py-2"
                >
                  <span className="text-muted-foreground">{it.label}</span>
                  <span className="font-semibold text-foreground">{it.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">لا توجد مشاكل ظاهرة ضمن الفترة.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
