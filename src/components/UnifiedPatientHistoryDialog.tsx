import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import RowDetailsDialog from "@/components/RowDetailsDialog";

type AnyRow = Record<string, any>;

function fmtDate(v: any) {
  if (!v) return "-";
  try {
    return format(new Date(v), "dd/MM/yyyy HH:mm", { locale: ar });
  } catch {
    return String(v);
  }
}

function renderValue(v: any) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  return String(v);
}

function Section({
  title,
  rows,
  columns,
  emptyMessage = "لا يوجد",
}: {
  title: string;
  rows: AnyRow[];
  columns: { key: string; label: string; isDate?: boolean }[];
  emptyMessage?: string;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<AnyRow | null>(null);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-bold text-primary">{title}</h3>
        <div className="h-px flex-1 bg-border" />
        <span className="text-sm font-semibold text-muted-foreground">({rows.length})</span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 px-6 py-8 text-center">
          <p className="text-muted-foreground font-medium">{emptyMessage}</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => (
                    <TableHead key={c.key} className="font-bold">
                      {c.label}
                    </TableHead>
                  ))}
                  <TableHead className="w-[140px] font-bold">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, idx) => (
                  <TableRow key={r.id ?? idx} className="hover:bg-accent/50">
                    {columns.map((c) => (
                      <TableCell key={c.key} className={c.key.includes("number") ? "font-mono" : undefined}>
                        {c.isDate ? fmtDate(r[c.key]) : renderValue(r[c.key])}
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDetailsRow(r);
                          setDetailsOpen(true);
                        }}
                      >
                        عرض التفاصيل
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <RowDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} row={detailsRow} title="تفاصيل السجل" />
        </div>
      )}
    </section>
  );
}

export type UnifiedHistoryPayload = {
  unified_number: string;
  admissions: AnyRow[];
  discharges: AnyRow[];
  emergencies: AnyRow[];
  endoscopies: AnyRow[];
  procedures: AnyRow[];
  loans: AnyRow[];
};

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
          <DialogTitle className="text-2xl">تفاصيل السجل</DialogTitle>
          <DialogDescription className="text-base">
            الرقم الموحد: <span className="font-bold text-foreground">{p?.unified_number ?? "-"}</span>
            {" • "}
            إجمالي السجلات: <span className="font-bold text-foreground">{totalRecords}</span>
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <ScrollArea className="max-h-[calc(90vh-180px)] px-1">
          <div className="space-y-6 pb-4">
            <Section title="سجلات الدخول" rows={p?.admissions ?? []} columns={[...columns.admissions]} emptyMessage="تفاصيل الدخول: لا يوجد" />
            <Section title="سجلات الطوارئ" rows={p?.emergencies ?? []} columns={[...columns.emergencies]} emptyMessage="تفاصيل الطوارئ: لا يوجد" />
            <Section title="سجلات المناظير" rows={p?.endoscopies ?? []} columns={[...columns.endoscopies]} emptyMessage="تفاصيل المناظير: لا يوجد" />
            <Section
              title="سجلات الإجراءات (بذل / استقبال / كلي)"
              rows={p?.procedures ?? []}
              columns={[...columns.procedures]}
              emptyMessage="تفاصيل الإجراءات: لا يوجد"
            />
            <Section title="سجلات الخروج" rows={p?.discharges ?? []} columns={[...columns.discharges]} emptyMessage="تفاصيل الخروج: لا يوجد" />
            <Section title="سجلات الاستعارات" rows={p?.loans ?? []} columns={[...columns.loans]} emptyMessage="تفاصيل الاستعارات: لا يوجد" />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
