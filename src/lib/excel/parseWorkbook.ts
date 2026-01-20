import * as XLSX from "xlsx";

export type ParsedExcel = {
  sheetName: string;
  headers: string[];
  rows: Record<string, unknown>[];
};

export async function parseFirstSheet(file: File): Promise<ParsedExcel> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  // Read raw rows as arrays so we can preserve all columns exactly
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
  const headerRow = (aoa[0] ?? []) as string[];
  const headers = headerRow.map((h) => String(h).trim()).filter(Boolean);

  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const r = aoa[i] ?? [];
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] ?? "";
    });

    // Skip fully empty rows
    const hasAny = Object.values(obj).some((v) => String(v ?? "").trim() !== "");
    if (!hasAny) continue;

    rows.push(obj);
  }

  return { sheetName, headers, rows };
}
