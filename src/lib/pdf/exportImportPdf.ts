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
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(14);
  doc.text(params.title, 40, 40);

  // المطلوب: PDF واحد يحتوي جدولين فقط (المستورد + المكرر حرفياً)
  const startY = 70;

  autoTable(doc, {
    startY,
    head: [["الصفوف التي تم استيرادها"]],
    body: [],
    styles: { fontSize: 11 },
    headStyles: { fillColor: [40, 40, 40] },
    theme: "plain",
  });

  const afterTitle1Y = (doc as any).lastAutoTable?.finalY ?? startY;
  const importedBody = (params.importedRows ?? []).map((r) => params.columns.map((c) => String(r[c] ?? "")));
  autoTable(doc, {
    startY: afterTitle1Y + 8,
    head: [params.columns],
    body: importedBody.length > 0 ? importedBody : [["(لا يوجد)"]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [60, 60, 60] },
  });

  const afterImportedY = (doc as any).lastAutoTable?.finalY ?? afterTitle1Y + 60;

  autoTable(doc, {
    startY: afterImportedY + 18,
    head: [["صفوف تم تجاهلها بسبب التكرار الحرفي"]],
    body: [],
    styles: { fontSize: 11 },
    headStyles: { fillColor: [40, 40, 40] },
    theme: "plain",
  });

  const afterTitle2Y = (doc as any).lastAutoTable?.finalY ?? afterImportedY + 18;
  const dupBody = (params.duplicatesRows ?? []).map((r) => params.columns.map((c) => String(r[c] ?? "")));
  autoTable(doc, {
    startY: afterTitle2Y + 8,
    head: [params.columns],
    body: dupBody.length > 0 ? dupBody : [["(لا يوجد)"]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [60, 60, 60] },
  });

  doc.save(params.fileName);
}
