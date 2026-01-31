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

function toIsoFromDateAndTime(dateV: unknown, timeV: unknown) {
  const dateS = normalizeCellValue(dateV);
  const timeS = normalizeCellValue(timeV);
  if (!dateS) return null;
  // Accept if time missing -> treat as date only at 00:00
  const candidate = timeS ? `${dateS}T${timeS}` : dateS;
  const d = new Date(candidate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function getDischargeDateIso(row: DischargeExcelRow) {
  return (
    toIsoLike(row["تاريخ ووقت الخروج"]) ||
    toIsoFromDateAndTime(row["تاريخ الخروج"], row["وقت الخروج"]) ||
    toIsoLike(row["تاريخ الخروج"]) ||
    null
  );
}

function getAdmissionDateIsoIfAny(row: DischargeExcelRow) {
  return (
    toIsoLike(row["تاريخ ووقت الدخول"]) ||
    // in case it was mapped via admissions aliases
    toIsoLike(row["تاريخ الحجز"]) ||
    toIsoFromDateAndTime(row["تاريخ الدخول"], row["وقت الدخول"]) ||
    toIsoLike(row["تاريخ الدخول"]) ||
    null
  );
}

function isKnownDischargeStatus(v: unknown) {
  const s = normalizeArabicText(normalizeCellValue(v));
  return [
    "تحسن",
    "تحويل",
    "وفاة",
    "وفاه",
    "هروب",
    "رفض العلاج",
    "رفض العلاج حسب الطلب",
    "حسب الطلب",
  ].includes(s);
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
  if (!getDischargeDateIso(row)) return "تاريخ/وقت الخروج غير صالح أو مفقود";

  const status = row["حالة الخروج"];
  if (!status || !isKnownDischargeStatus(status)) return "حالة الخروج غير معروفة أو مفقودة";

  const finance = row["مصدر التمويل"];
  if (finance && !isKnownFinanceSource(finance)) return "مصدر التمويل غير معروف";

  // admission date optional, but if present must be valid
  const admissionIso = getAdmissionDateIsoIfAny(row);
  const admissionRaw =
    normalizeCellValue(row["تاريخ ووقت الدخول"]) ||
    normalizeCellValue(row["تاريخ الدخول"]) ||
    normalizeCellValue(row["تاريخ الحجز"]);
  if (admissionRaw && !admissionIso) return "تاريخ/وقت الدخول غير صالح";

  return null;
}
