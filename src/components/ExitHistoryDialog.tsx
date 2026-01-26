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

export type ExitHistoryPayload = {
  unified_number: string;
  discharges: AnyRow[];
  endoscopies: AnyRow[];
  procedures: AnyRow[];
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

  const columns = useMemo(() => {
    return {
      discharges: [
        { key: "internal_number", label: "الرقم الداخلي" },
        { key: "discharge_status", label: "حالة الخروج" },
        { key: "discharge_date", label: "تاريخ الخروج", isDate: true },
      ],
      endoscopies: [
        { key: "internal_number", label: "الرقم الداخلي" },
        { key: "discharge_status", label: "الحالة" },
        { key: "discharge_status_other", label: "أخرى" },
        { key: "procedure_date", label: "تاريخ الإجراء", isDate: true },
      ],
      procedures: [
        { key: "internal_number", label: "الرقم الداخلي" },
        { key: "procedure_type", label: "النوع" },
        { key: "procedure_date", label: "تاريخ الإجراء", isDate: true },
      ],
    } as const;
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>سجل الخروج للرقم الموحد: {p?.unified_number ?? "-"}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="discharges">الخروج ({p?.discharges.length ?? 0})</TabsTrigger>
            <TabsTrigger value="endoscopies">المناظير ({p?.endoscopies.length ?? 0})</TabsTrigger>
            <TabsTrigger value="procedures">الإجراءات ({p?.procedures.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="discharges" className="mt-4">
            <SimpleTable rows={p?.discharges ?? []} columns={[...columns.discharges]} />
          </TabsContent>
          <TabsContent value="endoscopies" className="mt-4">
            <SimpleTable rows={p?.endoscopies ?? []} columns={[...columns.endoscopies]} />
          </TabsContent>
          <TabsContent value="procedures" className="mt-4">
            <SimpleTable rows={p?.procedures ?? []} columns={[...columns.procedures]} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
