import * as XLSX from "xlsx";

export type ImportExcelRow = Record<string, string | number | null | undefined>;

export function downloadImportReportExcel(params: {
  title: string;
  fileName: string;
  columns: string[];
  importedRows: ImportExcelRow[];
  duplicatesRows: ImportExcelRow[];
  errorRows: Array<ImportExcelRow & { __error_reason?: string }>;
}) {
  const wb = XLSX.utils.book_new();

  const today = new Date().toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const summaryData = [
    [params.title],
    [],
    ["تاريخ التقرير:", today],
    ["إجمالي الصفوف الناجحة:", params.importedRows.length],
    ["إجمالي المكرر حرفيًا:", params.duplicatesRows.length],
    ["إجمالي الصفوف بها أخطاء:", params.errorRows.length],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "ملخص التقرير");

  if (params.importedRows.length > 0) {
    const importedData = [
      params.columns,
      ...params.importedRows.map((row) => params.columns.map((col) => String(row[col] ?? ""))),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(importedData), "البيانات الناجحة");
  }

  if (params.duplicatesRows.length > 0) {
    const duplicatesData = [
      params.columns,
      ...params.duplicatesRows.map((row) => params.columns.map((col) => String(row[col] ?? ""))),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(duplicatesData), "مكرر حرفيًا");
  }

  if (params.errorRows.length > 0) {
    const cols = [...params.columns, "سبب الخطأ"];
    const errorData = [
      cols,
      ...params.errorRows.map((row) => [...params.columns.map((col) => String(row[col] ?? "")), String(row.__error_reason ?? "")]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(errorData), "أخطاء");
  }

  XLSX.writeFile(wb, params.fileName);
}
