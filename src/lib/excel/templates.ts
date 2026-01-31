import * as XLSX from "xlsx";

function safeFileName(base: string) {
  const cleaned = (base || "template")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 80);
  return cleaned.toLowerCase().endsWith(".xlsx") ? cleaned : `${cleaned}.xlsx`;
}

export function downloadExcelTemplate(args: {
  fileNameBase: string;
  sheetName?: string;
  headers: string[];
  notes?: string[];
}) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([args.headers]);
  XLSX.utils.book_append_sheet(wb, ws, args.sheetName ?? "data");

  const notesRows: (string | number)[][] = [
    ["ملاحظات"],
    [],
    ...(args.notes ?? ["- اكتب البيانات تحت العناوين مباشرة.", "- لا تغيّر أسماء الأعمدة."]).map((n) => [n]),
    [],
    ["آخر تحديث للقالب:", new Date().toLocaleString("ar-EG")],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(notesRows), "ملاحظات");

  XLSX.writeFile(wb, safeFileName(args.fileNameBase));
}

export const admissionsTemplateHeaders = [
  "الرقم الموحد",
  "اسم المريض",
  "الرقم القومي",
  "النوع",
  "المهنة",
  "الحالة الاجتماعية",
  "رقم الهاتف",
  "السن",
  "المحافظة",
  "القسم أو المركز",
  "العنوان تفصيلي",
  "المحطة اللي جاي منها",
  "القسم",
  "التشخيص",
  "الطبيب",
  "تاريخ الحجز",
  "تاريخ الإنشاء",
  // اختياري لربط الزيارة لو موجود عندك
  "الرقم الداخلي",
];

export const dischargesTemplateHeaders = [
  "الرقم الموحد",
  "اسم المريض",
  "الرقم القومي",
  "رقم الهاتف",
  "تاريخ ووقت الدخول",
  "تاريخ ووقت الخروج",
  "حالة الخروج",
  "مصدر التمويل",
  "قسم الخروج",
  "تشخيص الخروج",
  "تشخيص مصاحب",
  "طبيب الخروج",
  "مستشفى التحويل",
  "رقم قومي طفل",
  // اختياري: لو عندك رقم داخلي للزيارة
  "الرقم الداخلي",
  // اختياري: لو التاريخ والوقت منفصلين
  "تاريخ الدخول",
  "وقت الدخول",
  "تاريخ الخروج",
  "وقت الخروج",
];

export const servicesTemplateHeaders = [
  // routing
  "نوع الحدث", // طوارئ / إجراءات / مناظير
  "الرقم الموحد",
  "اسم المريض",

  // optional demographics
  "الرقم القومي",
  "النوع",
  "رقم الهاتف",
  "السن",
  "الحالة الاجتماعية",
  "المهنة",
  "المحافظة",
  "القسم أو المركز",
  "المحطة اللي جاي منها",
  "العنوان تفصيلي",

  // common
  "القسم",
  "التشخيص",
  "الطبيب",
  "تاريخ ووقت الحدث",
  "الرقم الداخلي",

  // procedures
  "نوع الإجراء", // بذل / استقبال / كلي
  "حالة الإجراء",
  "قسم التحويل من",
  "مستشفى التحويل",

  // endoscopy extras
  "تاريخ ووقت خروج المنظار",
  "حالة خروج المنظار",
  "حالة خروج المنظار الأخرى",
];
