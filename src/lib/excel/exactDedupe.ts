import { normalizeCellValue } from "./normalizeArabic";

export type ExcelRow = Record<string, unknown>;

export function buildExactRowKey(headers: string[], row: ExcelRow) {
  const values = headers.map((h) => normalizeCellValue(row[h]));
  return values.join("\u241F"); // unit separator to avoid collisions
}

export function dedupeExactRows(headers: string[], rows: ExcelRow[]) {
  const seen = new Map<string, number>();
  const unique: ExcelRow[] = [];
  const duplicates: { row: ExcelRow; firstIndex: number; duplicateIndex: number }[] = [];

  rows.forEach((row, idx) => {
    const key = buildExactRowKey(headers, row);
    const prev = seen.get(key);
    if (prev !== undefined) {
      duplicates.push({ row, firstIndex: prev, duplicateIndex: idx });
      return;
    }
    seen.set(key, idx);
    unique.push(row);
  });

  return { unique, duplicates };
}
