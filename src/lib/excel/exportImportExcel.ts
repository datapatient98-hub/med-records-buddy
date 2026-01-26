 import * as XLSX from "xlsx";
 
 export type ImportExcelRow = Record<string, string | number | null | undefined>;
 
 export function downloadImportSummaryExcel(params: {
   title: string;
   fileName: string;
   importedRows: ImportExcelRow[];
   duplicatesRows: ImportExcelRow[];
   columns: string[];
 }) {
   // إنشاء workbook جديد
   const wb = XLSX.utils.book_new();
 
   // معلومات التقرير
   const today = new Date().toLocaleDateString("ar-EG", {
     year: "numeric",
     month: "long",
     day: "numeric",
   });
 
   // ورقة ملخص التقرير
   const summaryData = [
     [params.title],
     [],
     ["تاريخ التقرير:", today],
     ["إجمالي المستورد:", params.importedRows.length],
     ["إجمالي المتجاهل:", params.duplicatesRows.length],
   ];
   const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
   XLSX.utils.book_append_sheet(wb, wsSummary, "ملخص التقرير");
 
   // ورقة البيانات المستوردة
   if (params.importedRows.length > 0) {
     const importedData = [
       params.columns,
       ...params.importedRows.map((row) => 
         params.columns.map((col) => String(row[col] ?? ""))
       ),
     ];
     const wsImported = XLSX.utils.aoa_to_sheet(importedData);
     XLSX.utils.book_append_sheet(wb, wsImported, "البيانات المستوردة");
   }
 
   // ورقة البيانات المتجاهلة
   if (params.duplicatesRows.length > 0) {
     const duplicatesData = [
       params.columns,
       ...params.duplicatesRows.map((row) => 
         params.columns.map((col) => String(row[col] ?? ""))
       ),
     ];
     const wsDuplicates = XLSX.utils.aoa_to_sheet(duplicatesData);
     XLSX.utils.book_append_sheet(wb, wsDuplicates, "البيانات المتجاهلة");
   }
 
   // تحميل الملف
   XLSX.writeFile(wb, params.fileName);
 }