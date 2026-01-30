import * as XLSX from "xlsx";
import { format } from "date-fns";

type LookupMaps = {
  departments: Record<string, string>;
  doctors: Record<string, string>;
  diagnoses: Record<string, string>;
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
    (ws as any)["!autofilter"] = {
      ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: headerKeys.length - 1, r: 0 } }),
    };
  }
}

function mapCommon(r: any, lookups: LookupMaps) {
  return {
    "الرقم الموحد": r.unified_number ?? r?.admission?.unified_number ?? "",
    "اسم المريض": r.patient_name ?? r?.admission?.patient_name ?? "",
    "الرقم القومي": r.national_id ?? "",
    "الهاتف": r.phone ?? "",
    "النوع": r.gender ?? "",
    "السن": r.age ?? "",
    "القسم": r.department_id ? lookups.departments[r.department_id] ?? r.department_id : "",
    "التشخيص": r.diagnosis_id ? lookups.diagnoses[r.diagnosis_id] ?? r.diagnosis_id : "",
    "الطبيب": r.doctor_id ? lookups.doctors[r.doctor_id] ?? r.doctor_id : "",
  };
}

export function exportAdmissionsExcel(args: {
  rows: any[];
  lookups: LookupMaps;
  fileName: string;
}) {
  const mapped = (args.rows ?? []).map((r) => ({
    ...mapCommon(r, args.lookups),
    "حالة الدخول": r.admission_status ?? "",
    "تاريخ الدخول": toDisplayDate(r.admission_date),
    "تاريخ التسجيل": toDisplayDate(r.created_at),
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(mapped);
  autoWidth(ws, mapped);
  XLSX.utils.book_append_sheet(wb, ws, "الدخول");
  XLSX.writeFile(wb, args.fileName);
}

export function exportDischargesExcel(args: {
  rows: any[];
  lookups: LookupMaps;
  fileName: string;
}) {
  const mapped = (args.rows ?? []).map((r) => ({
    ...mapCommon({ ...(r?.admission ?? {}), ...(r ?? {}) }, args.lookups),
    "حالة الخروج": r.discharge_status ?? "",
    "مصدر التمويل": r.finance_source ?? "",
    "تاريخ الخروج": toDisplayDate(r.discharge_date),
    "رقم داخلي": r.internal_number ?? r?.admission?.internal_number ?? "",
    "تاريخ التسجيل": toDisplayDate(r.created_at),
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(mapped);
  autoWidth(ws, mapped);
  XLSX.utils.book_append_sheet(wb, ws, "الخروج");
  XLSX.writeFile(wb, args.fileName);
}

export function exportEmergenciesExcel(args: {
  rows: any[];
  lookups: LookupMaps;
  fileName: string;
}) {
  const mapped = (args.rows ?? []).map((r) => ({
    ...mapCommon(r, args.lookups),
    "تاريخ الزيارة": toDisplayDate(r.visit_date),
    "رقم داخلي": r.internal_number ?? "",
    "تاريخ التسجيل": toDisplayDate(r.created_at),
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(mapped);
  autoWidth(ws, mapped);
  XLSX.utils.book_append_sheet(wb, ws, "الطوارئ");
  XLSX.writeFile(wb, args.fileName);
}

export function exportEndoscopiesExcel(args: {
  rows: any[];
  lookups: LookupMaps;
  fileName: string;
}) {
  const mapped = (args.rows ?? []).map((r) => ({
    ...mapCommon(r, args.lookups),
    "تاريخ الإجراء": toDisplayDate(r.procedure_date),
    "تاريخ الدخول": toDisplayDate(r.admission_date),
    "تاريخ الخروج": toDisplayDate(r.discharge_date),
    "حالة الخروج": r.discharge_status ?? r.discharge_status_other ?? "",
    "رقم داخلي": r.internal_number ?? "",
    "تاريخ التسجيل": toDisplayDate(r.created_at),
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(mapped);
  autoWidth(ws, mapped);
  XLSX.utils.book_append_sheet(wb, ws, "المناظير");
  XLSX.writeFile(wb, args.fileName);
}

export function exportProceduresExcel(args: {
  rows: any[];
  lookups: LookupMaps;
  fileName: string;
}) {
  const mapped = (args.rows ?? []).map((r) => ({
    ...mapCommon(r, args.lookups),
    "نوع الإجراء": r.procedure_type ?? "",
    "حالة الإجراء": r.procedure_status ?? "",
    "تاريخ الإجراء": toDisplayDate(r.procedure_date),
    "رقم داخلي": r.internal_number ?? "",
    "تاريخ التسجيل": toDisplayDate(r.created_at),
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(mapped);
  autoWidth(ws, mapped);
  XLSX.utils.book_append_sheet(wb, ws, "الإجراءات");
  XLSX.writeFile(wb, args.fileName);
}

export function exportLoansExcel(args: {
  rows: any[];
  fileName: string;
}) {
  const mapped = (args.rows ?? []).map((r) => ({
    "الرقم الموحد": r.unified_number ?? "",
    "Admission ID": r.admission_id ?? "",
    "رقم داخلي": r.internal_number ?? "",
    "المستعير": r.borrowed_by ?? "",
    "إلى قسم": r.borrowed_to_department ?? "",
    "سبب الاستعارة": r.loan_reason ?? "",
    "تاريخ الاستعارة": toDisplayDate(r.loan_date),
    "تم الإرجاع": r.is_returned ?? "",
    "تاريخ الإرجاع": toDisplayDate(r.return_date),
    "تاريخ التسجيل": toDisplayDate(r.created_at),
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(mapped);
  autoWidth(ws, mapped);
  XLSX.utils.book_append_sheet(wb, ws, "الاستعارات");
  XLSX.writeFile(wb, args.fileName);
}
