import { normalizeArabicText, normalizeCellValue } from "@/lib/excel/normalizeArabic";

export type DischargeExcelRow = Record<string, unknown>;

function toIsoLike(v: unknown) {
  const s = normalizeCellValue(v);
  if (!s) return null;
  const candidate = s.includes(" ") ? s.replace(" ", "T") : s;
  const d = new Date(candidate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function isKnownDischargeStatus(v: unknown) {
  const s = normalizeArabicText(normalizeCellValue(v));
  return ["تحسن", "تحويل", "وفاة", "هروب", "رفض العلاج"].includes(s);
}

function isKnownFinanceSource(v: unknown) {
  const s = normalizeArabicText(normalizeCellValue(v));
  return ["تأمين صحي", "علاج على نفقة الدولة", "خاص"].includes(s);
}

/**
 * Pre-validation for discharges.xlsx preview.
 */
export function validateDischargeExcelRow(row: DischargeExcelRow): string | null {
  const unified = normalizeCellValue(row["الرقم الموحد"]).replace(/\D/g, "");
  if (!unified) return "الرقم الموحد مفقود";

  // discharge date required
  if (!toIsoLike(row["تاريخ ووقت الخروج"])) return "تاريخ ووقت الخروج غير صالح أو مفقود";

  const status = row["حالة الخروج"];
  if (!status || !isKnownDischargeStatus(status)) return "حالة الخروج غير معروفة أو مفقودة";

  const finance = row["مصدر التمويل"];
  if (finance && !isKnownFinanceSource(finance)) return "مصدر التمويل غير معروف";

  // admission date optional, but if present must be valid
  const admissionDt = normalizeCellValue(row["تاريخ ووقت الدخول"]);
  if (admissionDt && !toIsoLike(admissionDt)) return "تاريخ ووقت الدخول غير صالح";

  return null;
}
