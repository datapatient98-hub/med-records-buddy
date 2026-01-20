import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ImportPdfRow = Record<string, string | number | null | undefined>;

export function downloadImportSummaryPdf(params: {
  title: string;
  fileName: string;
  stats: Record<string, string | number>;
  previewRows: ImportPdfRow[];
  previewColumns: string[];
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(14);
  doc.text(params.title, 40, 40);

  const statsBody = Object.entries(params.stats).map(([k, v]) => [k, String(v)]);
  autoTable(doc, {
    startY: 60,
    head: [["البند", "القيمة"]],
    body: statsBody,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [40, 40, 40] },
  });

  const afterStatsY = (doc as any).lastAutoTable?.finalY ?? 120;

  if (params.previewRows.length > 0) {
    const body = params.previewRows.map((r) => params.previewColumns.map((c) => String(r[c] ?? "")));
    autoTable(doc, {
      startY: afterStatsY + 20,
      head: [params.previewColumns],
      body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [60, 60, 60] },
    });
  }

  doc.save(params.fileName);
}
