import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import UnifiedHistorySummary from "@/components/UnifiedHistory/UnifiedHistorySummary";
import UnifiedHistoryVisits from "@/components/UnifiedHistory/UnifiedHistoryVisits";
import { fmtDate } from "@/components/UnifiedHistory/format";
import type { ColumnDef, UnifiedHistoryPayload } from "@/components/UnifiedHistory/types";

// Backward-compatible re-export (used in Layout / UnifiedDatabase)
export type { UnifiedHistoryPayload } from "@/components/UnifiedHistory/types";

export default function UnifiedPatientHistoryDialog({
  open,
  onOpenChange,
  payload,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  payload: UnifiedHistoryPayload | null;
}) {
  const columns = useMemo(() => {
    return {
      admissions: [
        { key: "internal_number", label: "الرقم الداخلي" },
        { key: "patient_name", label: "الاسم" },
        { key: "national_id", label: "الرقم القومي" },
        { key: "phone", label: "الهاتف" },
        { key: "admission_status", label: "الحالة" },
        { key: "admission_date", label: "تاريخ الدخول", isDate: true },
      ],
      discharges: [
        { key: "internal_number", label: "الرقم الداخلي" },
        { key: "discharge_status", label: "حالة الخروج" },
        { key: "finance_source", label: "مصدر التمويل" },
        { key: "discharge_date", label: "تاريخ الخروج", isDate: true },
      ],
      emergencies: [
        { key: "internal_number", label: "الرقم الداخلي" },
        { key: "patient_name", label: "الاسم" },
        { key: "national_id", label: "الرقم القومي" },
        { key: "phone", label: "الهاتف" },
        { key: "visit_date", label: "تاريخ الزيارة", isDate: true },
      ],
      endoscopies: [
        { key: "internal_number", label: "الرقم الداخلي" },
        { key: "patient_name", label: "الاسم" },
        { key: "national_id", label: "الرقم القومي" },
        { key: "procedure_date", label: "تاريخ المنظار", isDate: true },
      ],
      procedures: [
        { key: "internal_number", label: "الرقم الداخلي" },
        { key: "patient_name", label: "الاسم" },
        { key: "national_id", label: "الرقم القومي" },
        { key: "procedure_date", label: "تاريخ الإجراء", isDate: true },
      ],
      loans: [
        { key: "internal_number", label: "الرقم الداخلي" },
        { key: "borrowed_by", label: "المستعار" },
        { key: "borrowed_to_department", label: "إلى قسم" },
        { key: "loan_date", label: "تاريخ الاستعارة", isDate: true },
        { key: "return_date", label: "تاريخ الإرجاع", isDate: true },
        { key: "is_returned", label: "تم الإرجاع" },
      ],
    } as const;
  }, []);

  const sectionColumns: Record<keyof Omit<UnifiedHistoryPayload, "unified_number">, ColumnDef[]> = {
    admissions: [...columns.admissions],
    emergencies: [...columns.emergencies],
    endoscopies: [...columns.endoscopies],
    procedures: [...columns.procedures],
    discharges: [...columns.discharges],
    loans: [...columns.loans],
  };

  const p = payload;
  const totalRecords =
    (p?.admissions.length ?? 0) +
    (p?.discharges.length ?? 0) +
    (p?.emergencies.length ?? 0) +
    (p?.endoscopies.length ?? 0) +
    (p?.procedures.length ?? 0) +
    (p?.loans.length ?? 0);

  const headerMeta = useMemo(() => {
    const pickName = () => {
      return (
        p?.admissions?.[0]?.patient_name ??
        p?.emergencies?.[0]?.patient_name ??
        p?.endoscopies?.[0]?.patient_name ??
        p?.procedures?.[0]?.patient_name ??
        "-"
      );
    };

    const getSortTime = (r: any) => {
      const candidates = [r.discharge_date, r.procedure_date, r.visit_date, r.admission_date, r.loan_date, r.created_at, r.updated_at];
      for (const v of candidates) {
        if (!v) continue;
        const t = new Date(v).getTime();
        if (!Number.isNaN(t)) return t;
      }
      return 0;
    };

    const getLastEventDateRaw = (r: any) => {
      return (
        r.discharge_date ??
        r.procedure_date ??
        r.visit_date ??
        r.admission_date ??
        r.loan_date ??
        r.created_at ??
        r.updated_at ??
        null
      );
    };

    const allWithInternal = [
      ...(p?.discharges ?? []),
      ...(p?.procedures ?? []),
      ...(p?.endoscopies ?? []),
      ...(p?.emergencies ?? []),
      ...(p?.loans ?? []),
    ].filter((r: any) => r?.internal_number !== null && r?.internal_number !== undefined);

    allWithInternal.sort((a: any, b: any) => getSortTime(b) - getSortTime(a));
    const internalNumber = allWithInternal[0]?.internal_number ?? "-";

    const allRecords = [
      ...(p?.admissions ?? []),
      ...(p?.discharges ?? []),
      ...(p?.emergencies ?? []),
      ...(p?.endoscopies ?? []),
      ...(p?.procedures ?? []),
      ...(p?.loans ?? []),
    ];
    const lastEventRow = [...allRecords].sort((a: any, b: any) => getSortTime(b) - getSortTime(a))[0];
    const lastEventAt = lastEventRow ? fmtDate(getLastEventDateRaw(lastEventRow)) : "-";

    const lastUpdateRow = [...allRecords].sort((a: any, b: any) => {
      const ta = new Date(a?.updated_at ?? a?.created_at ?? 0).getTime() || 0;
      const tb = new Date(b?.updated_at ?? b?.created_at ?? 0).getTime() || 0;
      return tb - ta;
    })[0];
    const lastUpdateAt = lastUpdateRow ? fmtDate(lastUpdateRow?.updated_at ?? lastUpdateRow?.created_at) : "-";

    return {
      patientName: pickName(),
      unifiedNumber: p?.unified_number ?? "-",
      internalNumber,
      lastEventAt,
      lastUpdateAt,
    };
  }, [p]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">تفاصيل السجل</DialogTitle>
          <DialogDescription className="text-base text-center">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <span className="font-bold text-foreground">{headerMeta.patientName}</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-semibold">الرقم الموحد: {headerMeta.unifiedNumber}</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-semibold">الرقم الداخلي: {headerMeta.internalNumber}</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-semibold">آخر حدث: {headerMeta.lastEventAt}</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-semibold">آخر تحديث: {headerMeta.lastUpdateAt}</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <ScrollArea className="max-h-[calc(90vh-180px)] px-1">
          <div className="space-y-6 pb-6">
            <UnifiedHistorySummary unifiedNumber={p?.unified_number ?? "-"} totalRecords={totalRecords} />

            {p ? <UnifiedHistoryVisits payload={p} columns={sectionColumns} /> : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
