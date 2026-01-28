import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import RowDetailsDialog from "@/components/RowDetailsDialog";

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

function SimpleTable({
  rows,
  columns,
}: {
  rows: AnyRow[];
  columns: { key: string; label: string; isDate?: boolean }[];
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<AnyRow | null>(null);

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

      <RowDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        row={detailsRow}
        title="تفاصيل السجل"
      />
    </div>
  );
}

export type ExitHistoryPayload = {
  unified_number: string;
  discharges: AnyRow[];
  procedures: AnyRow[];
  loans: AnyRow[];
};

const ExitHistoryDialog = React.forwardRef<
  HTMLDivElement,
  {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    payload: ExitHistoryPayload | null;
  }
>(function ExitHistoryDialog({ open, onOpenChange, payload }, _ref) {
  // NOTE: forwardRef here is intentional to avoid Radix/React ref warnings
  // when this component is used in compositions that may pass refs.
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
          <DialogDescription>اختر التبويب ثم اضغط “عرض التفاصيل” لأي صف لعرض كل بياناته بشكل مرتب.</DialogDescription>
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
});

ExitHistoryDialog.displayName = "ExitHistoryDialog";

export default ExitHistoryDialog;
