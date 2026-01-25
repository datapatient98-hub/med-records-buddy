import { normalizeArabicText, normalizeCellValue } from "@/lib/excel/normalizeArabic";

export type AdmissionExcelRow = Record<string, unknown>;

function isKnownGender(v: unknown) {
  const s = normalizeArabicText(normalizeCellValue(v));
  return s === "ذكر" || s === "أنثى" || s === "male" || s === "female";
}

function isKnownMarital(v: unknown) {
  const s = normalizeArabicText(normalizeCellValue(v));
  return ["اعزب", "أعزب", "single", "متزوج", "married", "مطلق", "divorced", "ارمل", "أرمل", "widowed"].includes(s);
}

function isKnownStatus(v: unknown) {
  const s = normalizeArabicText(normalizeCellValue(v));
  return ["reserved", "محجوز", "حجز", "حجوز", "خروج", "discharged", "متوفى", "وفاه", "وفاة", "dead", "تحويل", "transfer"].includes(s);
}

function toIsoLike(v: unknown) {
  const s = normalizeCellValue(v);
  if (!s) return null;
  const candidate = s.includes(" ") ? s.replace(" ", "T") : s;
  const d = new Date(candidate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Pre-validation for the Admission Excel import preview.
 * Returns Arabic reason string when row should be excluded, otherwise null.
 */
export function validateAdmissionExcelRow(row: AdmissionExcelRow): string | null {
  const unified = normalizeCellValue(row["الرقم الموحد"]).replace(/\D/g, "");
  const patient = normalizeCellValue(row["اسم المريض"]);
  const national = normalizeCellValue(row["الرقم القومي"]).replace(/\D/g, "");

  // الحقول الإلزامية الأساسية فقط
  if (!unified) return "الرقم الموحد مفقود";
  if (!patient) return "اسم المريض مفقود";
  if (!national || national.length !== 14) return "الرقم القومي غير صالح (يجب 14 رقم)";
  
  // التحقق من الحقول الاختيارية فقط إذا كانت موجودة
  const gender = row["النوع"];
  if (gender && !isKnownGender(gender)) return "النوع غير معروف";
  
  const marital = row["الحالة الاجتماعية"];
  if (marital && !isKnownMarital(marital)) return "الحالة الاجتماعية غير معروفة";
  
  const phone = normalizeCellValue(row["رقم الهاتف"]).replace(/\D/g, "");
  if (phone && phone.length !== 11) return "رقم الهاتف غير صالح (يجب 11 رقم)";
  
  const ageStr = normalizeCellValue(row["السن"]);
  const age = ageStr ? Number(ageStr) : NaN;
  if (ageStr && !Number.isFinite(age)) return "السن غير صالح";
  
  const status = row["الحالة"];
  if (status && !isKnownStatus(status)) return "الحالة (Status) غير معروفة";
  
  if (!toIsoLike(row["تاريخ الحجز"])) return "تاريخ الحجز غير صالح أو مفقود";

  return null;
}

/**
 * Dedupe inside the same sheet by unified number (الرقم الموحد).
 * Returns duplicates as errors so the user sees them قبل التأكيد.
 */
export function markUnifiedNumberDuplicates(rows: AdmissionExcelRow[]) {
  const seen = new Map<string, number>();
  const errors: { index: number; reason: string; row: AdmissionExcelRow }[] = [];
  const unique: AdmissionExcelRow[] = [];

  rows.forEach((row, idx) => {
    const unified = normalizeCellValue(row["الرقم الموحد"]).replace(/\D/g, "");
    if (!unified) {
      unique.push(row);
      return;
    }
    const prev = seen.get(unified);
    if (prev !== undefined) {
      errors.push({ index: idx, reason: `الرقم الموحد مكرر داخل ملف الإكسل (أول ظهور: صف ${prev + 2})`, row });
      return;
    }
    seen.set(unified, idx);
    unique.push(row);
  });

  return { unique, errors };
}
