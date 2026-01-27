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
import UnifiedHistorySection from "@/components/UnifiedHistory/UnifiedHistorySection";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">تفاصيل السجل</DialogTitle>
          <DialogDescription className="text-base text-center">
            سجل شامل ومُرتّب لكل الأحداث الطبية المرتبطة بالرقم الموحد
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <ScrollArea className="max-h-[calc(90vh-180px)] px-1">
          <div className="space-y-6 pb-6">
            <UnifiedHistorySummary unifiedNumber={p?.unified_number ?? "-"} totalRecords={totalRecords} />

            <UnifiedHistorySection
              title="سجلات الدخول"
              tone="green"
              rows={p?.admissions ?? []}
              columns={sectionColumns.admissions}
              emptyMessage="تفاصيل الدخول: لا يوجد"
            />
            <UnifiedHistorySection
              title="سجلات الطوارئ"
              tone="orange"
              rows={p?.emergencies ?? []}
              columns={sectionColumns.emergencies}
              emptyMessage="تفاصيل الطوارئ: لا يوجد"
            />
            <UnifiedHistorySection
              title="سجلات المناظير"
              tone="cyan"
              rows={p?.endoscopies ?? []}
              columns={sectionColumns.endoscopies}
              emptyMessage="تفاصيل المناظير: لا يوجد"
            />
            <UnifiedHistorySection
              title="سجلات الإجراءات (بذل / استقبال / كلي)"
              tone="purple"
              rows={p?.procedures ?? []}
              columns={sectionColumns.procedures}
              emptyMessage="تفاصيل الإجراءات: لا يوجد"
            />
            <UnifiedHistorySection
              title="سجلات الخروج"
              tone="pink"
              rows={p?.discharges ?? []}
              columns={sectionColumns.discharges}
              emptyMessage="تفاصيل الخروج: لا يوجد"
            />
            <UnifiedHistorySection
              title="سجلات الاستعارات"
              tone="primary"
              rows={p?.loans ?? []}
              columns={sectionColumns.loans}
              emptyMessage="تفاصيل الاستعارات: لا يوجد"
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
