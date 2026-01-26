import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
    format: "a4",
  });

  // عنوان التقرير
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.text(params.title, pageWidth / 2, 40, { align: "center" });
  
  // معلومات إضافية
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const today = new Date().toLocaleDateString("ar-EG", { 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  });
  doc.text(`تاريخ التقرير: ${today}`, pageWidth - 40, 60, { align: "right" });
  doc.text(`إجمالي المستورد: ${params.importedRows.length}`, pageWidth - 40, 75, { align: "right" });
  doc.text(`إجمالي المتجاهل: ${params.duplicatesRows.length}`, pageWidth - 40, 90, { align: "right" });

  const startY = 110;

  // جدول البيانات المستوردة
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  autoTable(doc, {
    startY,
    head: [["✓ البيانات التي تم استيرادها بنجاح"]],
    body: [[``]],
    styles: { 
      fontSize: 12, 
      halign: "center",
      fillColor: [22, 163, 74],
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    theme: "plain",
    margin: { left: 40, right: 40 }
  });

  const afterTitle1Y = (doc as any).lastAutoTable?.finalY ?? startY;
  const importedBody = (params.importedRows ?? []).map((r) => 
    params.columns.map((c) => String(r[c] ?? "").substring(0, 50))
  );
  
  autoTable(doc, {
    startY: afterTitle1Y + 5,
    head: [params.columns],
    body: importedBody.length > 0 ? importedBody : [Array(params.columns.length).fill("لا يوجد بيانات")],
    styles: { 
      fontSize: 7,
      cellPadding: 3,
      overflow: "linebreak",
      halign: "right"
    },
    headStyles: { 
      fillColor: [71, 85, 105],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      halign: "right"
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 40, right: 40 }
  });

  const afterImportedY = (doc as any).lastAutoTable?.finalY ?? afterTitle1Y + 60;

  // جدول البيانات المكررة
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  autoTable(doc, {
    startY: afterImportedY + 25,
    head: [["⚠ صفوف تم تجاهلها بسبب التكرار الحرفي"]],
    body: [[``]],
    styles: { 
      fontSize: 12, 
      halign: "center",
      fillColor: [251, 146, 60],
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    theme: "plain",
    margin: { left: 40, right: 40 }
  });

  const afterTitle2Y = (doc as any).lastAutoTable?.finalY ?? afterImportedY + 18;
  const dupBody = (params.duplicatesRows ?? []).map((r) => 
    params.columns.map((c) => String(r[c] ?? "").substring(0, 50))
  );
  
  autoTable(doc, {
    startY: afterTitle2Y + 5,
    head: [params.columns],
    body: dupBody.length > 0 ? dupBody : [Array(params.columns.length).fill("لا يوجد بيانات")],
    styles: { 
      fontSize: 7,
      cellPadding: 3,
      overflow: "linebreak",
      halign: "right"
    },
    headStyles: { 
      fillColor: [220, 38, 38],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      halign: "right"
    },
    alternateRowStyles: {
      fillColor: [254, 242, 242]
    },
    margin: { left: 40, right: 40 }
  });

  // Footer مع رقم الصفحة
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `صفحة ${i} من ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" }
    );
  }

  doc.save(params.fileName);
}
