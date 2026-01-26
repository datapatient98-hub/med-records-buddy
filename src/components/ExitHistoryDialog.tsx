import { useState } from "react";
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

function RowDetails({ row }: { row: AnyRow }) {
  const keys = Object.keys(row ?? {}).sort();
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="grid gap-2 md:grid-cols-2">
        {keys.map((k) => (
          <div key={k} className="flex items-start justify-between gap-3">
            <div className="text-sm text-muted-foreground break-all">{k}</div>
            <div className="text-sm font-medium text-foreground break-all text-right">
              {k.toLowerCase().includes("date") || k.toLowerCase().includes("_at") ? fmtDate(row[k]) : renderValue(row[k])}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleTable({
  rows,
  columns,
}: {
  rows: AnyRow[];
  columns: { key: string; label: string; isDate?: boolean }[];
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key}>{c.label}</TableHead>
              ))}
              <TableHead className="w-[140px]">التفاصيل</TableHead>
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
                  <TableCell>
                    <details className="group">
                      <summary className="cursor-pointer select-none text-sm font-medium text-foreground underline-offset-4 group-open:underline">
                        عرض التفاصيل
                      </summary>
                      <div className="mt-2">
                        <RowDetails row={r} />
                      </div>
                    </details>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
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

export type ExitHistoryPayload = {
  unified_number: string;
  discharges: AnyRow[];
  procedures: AnyRow[];
  loans: AnyRow[];
};

export default function ExitHistoryDialog({
  open,
  onOpenChange,
  payload,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  payload: ExitHistoryPayload | null;
}) {
  const [tab, setTab] = useState("discharges");
  const p = payload;

  const dischargeColumns = [
    { key: "internal_number", label: "الرقم الداخلي" },
    { key: "discharge_status", label: "حالة الخروج" },
    { key: "discharge_date", label: "تاريخ الخروج", isDate: true },
    { key: "created_at", label: "وقت التسجيل", isDate: true },
  ];
  const procedureColumns = [
    { key: "internal_number", label: "الرقم الداخلي" },
    { key: "procedure_type", label: "النوع" },
    { key: "procedure_date", label: "تاريخ الإجراء", isDate: true },
    { key: "created_at", label: "وقت التسجيل", isDate: true },
  ];
  const loanColumns = [
    { key: "internal_number", label: "الرقم الداخلي" },
    { key: "borrowed_by", label: "المستعار" },
    { key: "borrowed_to_department", label: "إلى قسم" },
    { key: "loan_date", label: "تاريخ الاستعارة", isDate: true },
    { key: "return_date", label: "تاريخ الإرجاع", isDate: true },
    { key: "is_returned", label: "تم الإرجاع" },
    { key: "created_at", label: "وقت التسجيل", isDate: true },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>سجل الخروج للرقم الموحد: {p?.unified_number ?? "-"}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="discharges">الخروج ({p?.discharges.length ?? 0})</TabsTrigger>
            <TabsTrigger value="procedures">الإجراءات ({p?.procedures.length ?? 0})</TabsTrigger>
            <TabsTrigger value="loans">الاستعارات ({p?.loans.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="discharges" className="mt-4">
            <SimpleTable rows={p?.discharges ?? []} columns={dischargeColumns} />
          </TabsContent>
          <TabsContent value="procedures" className="mt-4">
            <SimpleTable rows={p?.procedures ?? []} columns={procedureColumns} />
          </TabsContent>
          <TabsContent value="loans" className="mt-4">
            <SimpleTable rows={p?.loans ?? []} columns={loanColumns} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
