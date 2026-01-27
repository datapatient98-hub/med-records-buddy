import * as XLSX from "xlsx";
import { format } from "date-fns";

type DeletionAuditRow = {
  deleted_at: string;
  deleted_by: string | null;
  reason: string;
  unified_number: string | null;
  patient_name: string | null;
  internal_number: number | null;
  table_name: string;
  record_id: string | null;
  record_snapshot: unknown;
};

function toDisplayDate(value: unknown) {
  if (!value) return "";
  try {
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    return format(d, "yyyy-MM-dd HH:mm");
  } catch {
    return String(value);
  }
}

function autoWidth(ws: XLSX.WorkSheet, rows: Record<string, unknown>[]) {
  const headerKeys = rows.length ? Object.keys(rows[0]) : [];
  const widths = headerKeys.map((k) => {
    const headerLen = k.length;
    const maxLen = rows.reduce((acc, r) => {
      const v = r[k];
      const s = v == null ? "" : String(v);
      return Math.max(acc, s.length);
    }, headerLen);
    return { wch: Math.min(Math.max(maxLen + 2, 10), 44) };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ws as any)["!cols"] = widths;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ws as any)["!freeze"] = { xSplit: 0, ySplit: 1 };
  if (headerKeys.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ws as any)["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: headerKeys.length - 1, r: 0 } }) };
  }
}

export function downloadDeletionAuditExcel(args: {
  fileName: string;
  rows: DeletionAuditRow[];
  exportedAt: Date;
}) {
  const wb = XLSX.utils.book_new();

  const summaryAoA: (string | number)[][] = [
    ["سجل المحذوفات"],
    [],
    ["تاريخ التصدير:", format(args.exportedAt, "yyyy-MM-dd HH:mm")],
    ["عدد السجلات:", args.rows.length],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoA);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (wsSummary as any)["!cols"] = [{ wch: 24 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "ملخص");

  const mapped = args.rows.map((r) => ({
    "وقت الحذف": toDisplayDate(r.deleted_at),
    "اسم المنفذ": r.deleted_by ?? "",
    "سبب الحذف": r.reason ?? "",
    "الرقم الموحد": r.unified_number ?? "",
    "اسم المريض": r.patient_name ?? "",
    "رقم داخلي": r.internal_number ?? "",
    "الجدول": r.table_name,
    "Record ID": r.record_id ?? "",
  }));
  const ws = XLSX.utils.json_to_sheet(mapped);
  autoWidth(ws, mapped);
  XLSX.utils.book_append_sheet(wb, ws, "المحذوفات");

  const snapshots = args.rows.map((r) => ({
    "الجدول": r.table_name,
    "Record ID": r.record_id ?? "",
    "Snapshot": safeStringify(r.record_snapshot),
  }));
  const wsSnap = XLSX.utils.json_to_sheet(snapshots);
  autoWidth(wsSnap, snapshots);
  XLSX.utils.book_append_sheet(wb, wsSnap, "Snapshot");

  // Put summary first
  const names = wb.SheetNames;
  const first = names.splice(names.indexOf("ملخص"), 1);
  if (first.length) wb.SheetNames = [first[0], ...names];

  XLSX.writeFile(wb, args.fileName);
}

function safeStringify(v: unknown) {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v ?? "");
  }
}
