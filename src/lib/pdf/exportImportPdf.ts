import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// دالة مساعدة لعكس النص العربي لعرضه صحيح في PDF
function reverseArabicText(text: string): string {
  if (!text) return "";
  // عكس النص بالكامل ليظهر بشكل صحيح في PDF
  return text.split("").reverse().join("");
}

export type ImportPdfRow = Record<string, string | number | null | undefined>;

export function downloadImportSummaryPdf(params: {
  title: string;
  fileName: string;
  importedRows: ImportPdfRow[];
  duplicatesRows: ImportPdfRow[];
  columns: string[];
}) {
  const doc = new jsPDF({ 
    orientation: "landscape", 
    unit: "pt", 
    format: "a4"
  });

  // عنوان التقرير بالعربي
  doc.setFontSize(18);
  doc.setFont("helvetica", "normal");
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.text(reverseArabicText(params.title), pageWidth / 2, 40, { align: "center" });
  
  // معلومات التقرير
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const today = new Date().toLocaleDateString("ar-EG", { 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  });
  const reportDate = reverseArabicText(`تاريخ التقرير: ${today}`);
  const totalImported = reverseArabicText(`إجمالي المستورد: ${params.importedRows.length}`);
  const totalIgnored = reverseArabicText(`إجمالي المتجاهل: ${params.duplicatesRows.length}`);
  
  doc.text(reportDate, pageWidth - 40, 60, { align: "right" });
  doc.text(totalImported, pageWidth - 40, 75, { align: "right" });
  doc.text(totalIgnored, pageWidth - 40, 90, { align: "right" });

  const startY = 110;

  // جدول البيانات المستوردة بنجاح
  doc.setFontSize(12);
  autoTable(doc, {
    startY,
    head: [[reverseArabicText("البيانات التي تم استيرادها بنجاح ✓")]],
    body: [[""]],
    styles: { 
      fontSize: 12, 
      halign: "center",
      fillColor: [22, 163, 74],
      textColor: [255, 255, 255],
      font: "helvetica",
      fontStyle: "normal"
    },
    theme: "plain",
    margin: { left: 40, right: 40 }
  });

  const afterTitle1Y = (doc as any).lastAutoTable?.finalY ?? startY;
  const importedBody = (params.importedRows ?? []).map((r) => 
    params.columns.map((c) => reverseArabicText(String(r[c] ?? "").substring(0, 50)))
  );
  
  autoTable(doc, {
    startY: afterTitle1Y + 5,
    head: [params.columns.map(c => reverseArabicText(c))],
    body: importedBody.length > 0 ? importedBody : [Array(params.columns.length).fill(reverseArabicText("لا يوجد بيانات"))],
    styles: { 
      fontSize: 7,
      cellPadding: 3,
      overflow: "linebreak",
      halign: "right",
      font: "helvetica",
      fontStyle: "normal"
    },
    headStyles: { 
      fillColor: [71, 85, 105],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "normal",
      halign: "right",
      font: "helvetica"
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 40, right: 40 }
  });

  const afterImportedY = (doc as any).lastAutoTable?.finalY ?? afterTitle1Y + 60;

  // جدول البيانات المتجاهلة (المكررة)
  doc.setFontSize(12);
  autoTable(doc, {
    startY: afterImportedY + 25,
    head: [[reverseArabicText("صفوف تم تجاهلها بسبب التكرار الحرفي")]],
    body: [[""]],
    styles: { 
      fontSize: 12, 
      halign: "center",
      fillColor: [251, 146, 60],
      textColor: [255, 255, 255],
      fontStyle: "normal",
      font: "helvetica"
    },
    theme: "plain",
    margin: { left: 40, right: 40 }
  });

  const afterTitle2Y = (doc as any).lastAutoTable?.finalY ?? afterImportedY + 18;
  const dupBody = (params.duplicatesRows ?? []).map((r) => 
    params.columns.map((c) => reverseArabicText(String(r[c] ?? "").substring(0, 50)))
  );
  
  autoTable(doc, {
    startY: afterTitle2Y + 5,
    head: [params.columns.map(c => reverseArabicText(c))],
    body: dupBody.length > 0 ? dupBody : [Array(params.columns.length).fill(reverseArabicText("لا يوجد بيانات"))],
    styles: { 
      fontSize: 7,
      cellPadding: 3,
      overflow: "linebreak",
      halign: "right",
      font: "helvetica",
      fontStyle: "normal"
    },
    headStyles: { 
      fillColor: [220, 38, 38],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "normal",
      halign: "right",
      font: "helvetica"
    },
    alternateRowStyles: {
      fillColor: [254, 242, 242]
    },
    margin: { left: 40, right: 40 }
  });

  // ترقيم الصفحات بالعربي
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const pageText = reverseArabicText(`صفحة ${i} من ${pageCount}`);
    doc.text(
      pageText,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" }
    );
  }

  doc.save(params.fileName);
}
