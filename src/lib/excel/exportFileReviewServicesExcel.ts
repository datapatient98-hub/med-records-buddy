import * as XLSX from "xlsx";
import { format } from "date-fns";

type DateRange = { from: string; to: string };

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

export function downloadFileReviewServicesExcel(args: {
  range: DateRange;
  exportedAt: Date;
  fileName: string;
  emergencies: any[];
  endoscopies: any[];
  procedures: any[];
  loans: any[];
}) {
  const wb = XLSX.utils.book_new();

  const notesAoA: (string | number)[][] = [
    ["ملاحظات"],
    [],
    ["- هذا الملف للتدقيق/المراجعة ويحتوي على شيتات منفصلة لكل نوع."],
    ["- تم تصميم الأعمدة لتكون (Non‑breaking): أي أعمدة جديدة تُضاف في نهاية الشيت."],
    ["- التواريخ يتم عرضها بتنسيق قابل للقراءة، وقد تُعرض القيمة الأصلية إذا كانت غير قابلة للتحويل لتاريخ."],
    [],
    ["آخر تحديث للقالب:", format(args.exportedAt, "yyyy-MM-dd HH:mm")],
  ];
  const wsNotes = XLSX.utils.aoa_to_sheet(notesAoA);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (wsNotes as any)["!cols"] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsNotes, "ملاحظات");

  const summaryAoA: (string | number)[][] = [
    ["مراجعة الملفات - ملف الخدمات"],
    [],
    ["الفترة:", `${args.range.from} → ${args.range.to}`],
    ["تاريخ التصدير:", format(args.exportedAt, "yyyy-MM-dd HH:mm")],
    [],
    ["النوع", "العدد"],
    ["الطوارئ", args.emergencies.length],
    ["المناظير", args.endoscopies.length],
    ["الإجراءات", args.procedures.length],
    ["الاستعارات", args.loans.length],
    [],
    ["الإجمالي", args.emergencies.length + args.endoscopies.length + args.procedures.length + args.loans.length],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoA);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (wsSummary as any)["!cols"] = [{ wch: 24 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "الملخص");

  const mapCommon = (r: any) => ({
    "الرقم الموحد": r.unified_number ?? "",
    "اسم المريض": r.patient_name ?? "",
    "الرقم القومي": r.national_id ?? "",
    "الهاتف": r.phone ?? "",
    "رقم داخلي": r.internal_number ?? "",
    "تاريخ التسجيل": toDisplayDate(r.created_at),
  });

  const emergencies = (args.emergencies ?? []).map((r) => ({
    ...mapCommon(r),
    "تاريخ الزيارة": toDisplayDate(r.visit_date),
  }));
  const endoscopies = (args.endoscopies ?? []).map((r) => ({
    ...mapCommon(r),
    "تاريخ الإجراء": toDisplayDate(r.procedure_date),
  }));
  const procedures = (args.procedures ?? []).map((r) => ({
    ...mapCommon(r),
    "نوع الإجراء": r.procedure_type ?? "",
    "تاريخ الإجراء": toDisplayDate(r.procedure_date),
    // Non-breaking append-only columns
    "سبب/حالة/ملاحظات": r.procedure_status ?? "",
  }));

  const loans = (args.loans ?? []).map((r) => ({
    ...mapCommon(r),
    "تاريخ الاستعارة": toDisplayDate(r.loan_date),
    "المستعير": r.borrowed_by ?? "",
    "إلى قسم": r.borrowed_to_department ?? "",
    "سبب الاستعارة": r.loan_reason ?? "",
    "تم الإرجاع": r.is_returned ?? "",
    "تاريخ الإرجاع": toDisplayDate(r.return_date),
  }));

  const wsE = XLSX.utils.json_to_sheet(emergencies);
  autoWidth(wsE, emergencies);
  XLSX.utils.book_append_sheet(wb, wsE, "الطوارئ");

  const wsEn = XLSX.utils.json_to_sheet(endoscopies);
  autoWidth(wsEn, endoscopies);
  XLSX.utils.book_append_sheet(wb, wsEn, "المناظير");

  const wsP = XLSX.utils.json_to_sheet(procedures);
  autoWidth(wsP, procedures);
  XLSX.utils.book_append_sheet(wb, wsP, "الإجراءات");

  const wsL = XLSX.utils.json_to_sheet(loans);
  autoWidth(wsL, loans);
  XLSX.utils.book_append_sheet(wb, wsL, "الاستعارات");

  XLSX.writeFile(wb, args.fileName);
}
