import { getExcelSourceSignedUrl } from "@/lib/excelSourceRemote";
import { parseFirstSheetFromArrayBuffer } from "@/lib/excel/parseWorkbook";
import { importDischargesFromExcel } from "@/lib/excel/importDischargesFromExcel";

export type SmartSyncResult = {
  admissionsFile: {
    totalRows: number;
  };
  dischargesFile: {
    totalRows: number;
  };
  dischargesImport: Awaited<ReturnType<typeof importDischargesFromExcel>>;
};

async function fetchArrayBuffer(signedUrl: string) {
  const resp = await fetch(signedUrl);
  if (!resp.ok) throw new Error("تعذر تحميل ملف الإكسل من التخزين");
  return await resp.arrayBuffer();
}

/**
 * Smart Sync:
 * - Reads the cloud-stored admissions.xlsx + discharges.xlsx
 * - Uses discharges.xlsx as the authoritative clinical event times for discharge_date (and admission_date when provided)
 * - Applies updates/inserts via existing import logic
 */
export async function smartSyncFromExcelSources(): Promise<SmartSyncResult> {
  const [admUrl, disUrl] = await Promise.all([
    getExcelSourceSignedUrl({ key: "excel_source_admissions", expiresIn: 120 }),
    getExcelSourceSignedUrl({ key: "excel_source_discharges", expiresIn: 120 }),
  ]);

  const [admBuf, disBuf] = await Promise.all([fetchArrayBuffer(admUrl.signedUrl), fetchArrayBuffer(disUrl.signedUrl)]);

  const [admParsed, disParsed] = await Promise.all([
    parseFirstSheetFromArrayBuffer(admBuf),
    parseFirstSheetFromArrayBuffer(disBuf),
  ]);

  // NOTE: admissions.xlsx is currently a reference file; the active sync is applied from discharges.xlsx.
  // We still parse admissions.xlsx so the system can validate availability and provide counts.
  const dischargesImport = await importDischargesFromExcel(disParsed.rows);

  return {
    admissionsFile: { totalRows: admParsed.rows.length },
    dischargesFile: { totalRows: disParsed.rows.length },
    dischargesImport,
  };
}
