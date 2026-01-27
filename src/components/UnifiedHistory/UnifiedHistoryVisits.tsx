import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import UnifiedHistorySection from "@/components/UnifiedHistory/UnifiedHistorySection";
import { fmtDate } from "@/components/UnifiedHistory/format";
import type { ColumnDef, UnifiedHistoryPayload } from "@/components/UnifiedHistory/types";
import { groupHistoryIntoVisits } from "@/components/UnifiedHistory/visitGrouping";

type ColumnsBySection = Record<keyof Omit<UnifiedHistoryPayload, "unified_number">, ColumnDef[]>;

export default function UnifiedHistoryVisits({
  payload,
  columns,
}: {
  payload: UnifiedHistoryPayload;
  columns: ColumnsBySection;
}) {
  const visits = useMemo(() => groupHistoryIntoVisits(payload), [payload]);

  return (
    <div className="space-y-6">
      {visits.map((v, idx) => {
        const title = v.startAt ? `زيارة دخول: ${fmtDate(v.startAt)}` : "أحداث بدون دخول";
        const headerMeta = v.admission
          ? {
              status: v.admission.admission_status ?? "-",
              source: v.admission.admission_source ?? "-",
            }
          : null;

        return (
          <section key={v.key} className="space-y-4">
            <Card className="border bg-muted/20">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold">{title}</h3>
                    {headerMeta ? (
                      <div className="text-xs text-muted-foreground">
                        الحالة: <span className="font-semibold text-foreground">{String(headerMeta.status)}</span>
                        <span className="mx-2">•</span>
                        نوع الدخول: <span className="font-semibold text-foreground">{String(headerMeta.source)}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground font-semibold">زيارة #{idx + 1}</div>
                </div>
              </CardContent>
            </Card>

            {/* داخل الزيارة: أقسام */}
            {v.admissions.length ? (
              <UnifiedHistorySection
                title="بيانات الدخول"
                tone="green"
                rows={v.admissions}
                columns={columns.admissions}
                emptyMessage="بيانات الدخول: لا يوجد"
              />
            ) : null}

            <UnifiedHistorySection
              title="الطوارئ"
              tone="orange"
              rows={v.emergencies}
              columns={columns.emergencies}
              emptyMessage="الطوارئ: لا يوجد"
            />

            <UnifiedHistorySection
              title="الإجراءات"
              tone="purple"
              rows={v.procedures}
              columns={columns.procedures}
              emptyMessage="الإجراءات: لا يوجد"
            />

            <UnifiedHistorySection
              title="المناظير"
              tone="cyan"
              rows={v.endoscopies}
              columns={columns.endoscopies}
              emptyMessage="المناظير: لا يوجد"
            />

            <UnifiedHistorySection
              title="الاستعارات"
              tone="primary"
              rows={v.loans}
              columns={columns.loans}
              emptyMessage="الاستعارات: لا يوجد"
            />

            <UnifiedHistorySection
              title="الخروج"
              tone="pink"
              rows={v.discharges}
              columns={columns.discharges}
              emptyMessage="الخروج: لا يوجد"
            />
          </section>
        );
      })}
    </div>
  );
}
