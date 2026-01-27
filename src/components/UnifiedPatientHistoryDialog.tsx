import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

type AnyRow = Record<string, any>;

function fmtDate(v: any) {
  if (!v) return "-";
  try {
    return format(new Date(v), "dd/MM/yyyy HH:mm");
  } catch {
    return String(v);
  }
}

function renderValue(v: any) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  return String(v);
}

function SimpleTable({ rows, columns }: { rows: AnyRow[]; columns: { key: string; label: string; isDate?: boolean }[] }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key}>{c.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((r, idx) => (
                <TableRow key={r.id ?? idx}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className={c.key.includes("number") ? "font-mono" : undefined}>
                      {c.isDate ? fmtDate(r[c.key]) : renderValue(r[c.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                  لا توجد بيانات
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
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
  const [tab, setTab] = useState("admissions");

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
        { key: "discharge_status", label: "حالة الخروج" },
        { key: "finance_source", label: "مصدر التمويل" },
        { key: "child_national_id", label: "رقم قومي طفل" },
        { key: "discharge_date", label: "تاريخ الخروج", isDate: true },
      ],
      emergencies: [
        { key: "patient_name", label: "الاسم" },
        { key: "national_id", label: "الرقم القومي" },
        { key: "visit_date", label: "تاريخ الزيارة", isDate: true },
      ],
      endoscopies: [
        { key: "patient_name", label: "الاسم" },
        { key: "national_id", label: "الرقم القومي" },
        { key: "procedure_date", label: "تاريخ المنظار", isDate: true },
      ],
      procedures: [
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>كل السجلات للرقم الموحد: {p?.unified_number ?? "-"}</DialogTitle>
        </DialogHeader>

          <div className="rounded-md border bg-secondary/40 px-3 py-2 text-sm">
            <span className="font-semibold text-foreground">تم العثور على البيانات</span>
            <span className="text-muted-foreground"> — اختر التبويب لعرض تفاصيل الدخول/الخروج/الإجراءات/الاستعارات.</span>
          </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="admissions">دخول ({p?.admissions.length ?? 0})</TabsTrigger>
            <TabsTrigger value="discharges">خروج ({p?.discharges.length ?? 0})</TabsTrigger>
            <TabsTrigger value="emergencies">طوارئ ({p?.emergencies.length ?? 0})</TabsTrigger>
            <TabsTrigger value="endoscopies">مناظير ({p?.endoscopies.length ?? 0})</TabsTrigger>
            <TabsTrigger value="procedures">بذل ({p?.procedures.length ?? 0})</TabsTrigger>
            <TabsTrigger value="loans">استعارات ({p?.loans.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="admissions" className="mt-4">
            <SimpleTable rows={p?.admissions ?? []} columns={[...columns.admissions]} />
          </TabsContent>
          <TabsContent value="discharges" className="mt-4">
            <SimpleTable rows={p?.discharges ?? []} columns={[...columns.discharges]} />
          </TabsContent>
          <TabsContent value="emergencies" className="mt-4">
            <SimpleTable rows={p?.emergencies ?? []} columns={[...columns.emergencies]} />
          </TabsContent>
          <TabsContent value="endoscopies" className="mt-4">
            <SimpleTable rows={p?.endoscopies ?? []} columns={[...columns.endoscopies]} />
          </TabsContent>
          <TabsContent value="procedures" className="mt-4">
            <SimpleTable rows={p?.procedures ?? []} columns={[...columns.procedures]} />
          </TabsContent>
          <TabsContent value="loans" className="mt-4">
            <SimpleTable rows={p?.loans ?? []} columns={[...columns.loans]} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
