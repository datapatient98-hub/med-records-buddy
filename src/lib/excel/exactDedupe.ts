import { normalizeCellValue } from "./normalizeArabic";

export type ExcelRow = Record<string, unknown>;

export function buildExactRowKey(headers: string[], row: ExcelRow) {
  const values = headers.map((h) => normalizeCellValue(row[h]));
  return values.join("\u241F"); // unit separator to avoid collisions
}

export function dedupeExactRows(headers: string[], rows: ExcelRow[]) {
  // تم تعطيل نظام إزالة التكرار - استيراد كل الصفوف كما هي
  return { 
    unique: rows, 
    duplicates: [] as { row: ExcelRow; firstIndex: number; duplicateIndex: number }[]
  };
}
