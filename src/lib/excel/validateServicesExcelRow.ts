import { normalizeArabicText, normalizeCellValue } from "@/lib/excel/normalizeArabic";

export type ServicesExcelRow = Record<string, unknown>;

function toIsoLike(v: unknown) {
  const s = normalizeCellValue(v);
  if (!s) return null;
  const candidate = s.includes(" ") ? s.replace(" ", "T") : s;
  const d = new Date(candidate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function normalizeType(v: unknown) {
  const s = normalizeArabicText(normalizeCellValue(v));
  if (["طوارئ"].includes(s)) return "طوارئ" as const;
  if (["اجراءات", "إجراءات"].includes(s)) return "إجراءات" as const;
  if (["مناظير", "مناظير"].includes(s)) return "مناظير" as const;
  if (["استعارات"].includes(s)) return "استعارات" as const;
  return null;
}

/**
 * Pre-validation for services.xlsx preview.
 */
export function validateServicesExcelRow(row: ServicesExcelRow): string | null {
  const unified = normalizeCellValue(row["الرقم الموحد"]).replace(/\D/g, "");
  if (!unified) return "الرقم الموحد مفقود";

  const type = normalizeType(row["نوع الحدث"]);
  if (!type) return "نوع الحدث غير معروف";

  const eventIso = toIsoLike(row["تاريخ ووقت الحدث"]);
  if (!eventIso) return "تاريخ ووقت الحدث غير صالح أو مفقود";

  if (type === "إجراءات") {
    const pType = normalizeArabicText(normalizeCellValue(row["نوع الإجراء"]));
    if (!pType) return "نوع الإجراء مفقود";
    if (!["بذل", "استقبال", "كلي"].includes(pType)) return "نوع الإجراء غير معروف";
  }

  if (type === "مناظير") {
    // endoscopy discharge fields are optional; event_date is procedure_date.
    const discharge = normalizeCellValue(row["تاريخ ووقت خروج المنظار"]);
    if (discharge && !toIsoLike(discharge)) return "تاريخ ووقت خروج المنظار غير صالح";
  }

  return null;
}
