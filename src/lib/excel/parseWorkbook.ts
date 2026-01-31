import * as XLSX from "xlsx";
import { normalizeArabicText } from "@/lib/excel/normalizeArabic";

export type ParsedExcel = {
  sheetName: string;
  headers: string[];
  rows: Record<string, unknown>[];
};

function parseFirstSheetFromWorkbook(wb: XLSX.WorkBook): ParsedExcel {
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  // Read raw rows as arrays so we can preserve all columns exactly
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
  const headerRow = (aoa[0] ?? []) as string[];
  const headers = headerRow.map((h) => String(h).trim()).filter(Boolean);

  // Map common header variations (Arabic/English) to the canonical keys used by import code.
  // We keep `headers` as-is for preview display, but we also inject canonical keys into each row object.
  const normalizeHeaderKey = (h: string) =>
    normalizeArabicText(String(h))
      .toLowerCase()
      .replace(/[\s_\-–—:؛،,./\\]+/g, " ")
      .trim();

  const headerAliasMap: Record<string, string> = {
    // unified
    [normalizeHeaderKey("الرقم الموحد")]: "الرقم الموحد",
    [normalizeHeaderKey("رقم موحد")]: "الرقم الموحد",
    [normalizeHeaderKey("unified number")]: "الرقم الموحد",
    // patient
    [normalizeHeaderKey("اسم المريض")]: "اسم المريض",
    [normalizeHeaderKey("اسم")]: "اسم المريض",
    [normalizeHeaderKey("patient name")]: "اسم المريض",
    // national id
    [normalizeHeaderKey("الرقم القومي")]: "الرقم القومي",
    [normalizeHeaderKey("رقم قومي")]: "الرقم القومي",
    [normalizeHeaderKey("national id")]: "الرقم القومي",
    // gender
    [normalizeHeaderKey("النوع")]: "النوع",
    [normalizeHeaderKey("gender")]: "النوع",
    // marital
    [normalizeHeaderKey("الحالة الاجتماعية")]: "الحالة الاجتماعية",
    [normalizeHeaderKey("الحاله الاجتماعيه")]: "الحالة الاجتماعية",
    [normalizeHeaderKey("marital status")]: "الحالة الاجتماعية",
    // phone
    [normalizeHeaderKey("رقم الهاتف")]: "رقم الهاتف",
    [normalizeHeaderKey("الهاتف")]: "رقم الهاتف",
    [normalizeHeaderKey("phone")]: "رقم الهاتف",
    // age
    [normalizeHeaderKey("السن")]: "السن",
    [normalizeHeaderKey("سن")]: "السن",
    [normalizeHeaderKey("age")]: "السن",
    // governorate
    [normalizeHeaderKey("المحافظة")]: "المحافظة",
    [normalizeHeaderKey("محافظة")]: "المحافظة",
    [normalizeHeaderKey("governorate")]: "المحافظة",
    // district
    [normalizeHeaderKey("القسم أو المركز")]: "القسم أو المركز",
    [normalizeHeaderKey("القسم او المركز")]: "القسم أو المركز",
    [normalizeHeaderKey("المركز")]: "القسم أو المركز",
    [normalizeHeaderKey("الحي")]: "القسم أو المركز",
    [normalizeHeaderKey("district")]: "القسم أو المركز",
    // station
    [normalizeHeaderKey("المحطة اللي جاي منها")]: "المحطة اللي جاي منها",
    [normalizeHeaderKey("المحطة")]: "المحطة اللي جاي منها",
    [normalizeHeaderKey("station")]: "المحطة اللي جاي منها",
    // department
    [normalizeHeaderKey("القسم")]: "القسم",
    [normalizeHeaderKey("قسم")]: "القسم",
    [normalizeHeaderKey("department")]: "القسم",
    // occupation
    [normalizeHeaderKey("المهنة")]: "المهنة",
    [normalizeHeaderKey("مهنة")]: "المهنة",
    [normalizeHeaderKey("occupation")]: "المهنة",
    // address
    [normalizeHeaderKey("العنوان تفصيلي")]: "العنوان تفصيلي",
    [normalizeHeaderKey("العنوان التفصيلي")]: "العنوان تفصيلي",
    [normalizeHeaderKey("address")]: "العنوان تفصيلي",
    // status
    [normalizeHeaderKey("الحالة")]: "الحالة",
    [normalizeHeaderKey("status")]: "الحالة",
    // diagnosis/doctor
    [normalizeHeaderKey("التشخيص")]: "التشخيص",
    [normalizeHeaderKey("diagnosis")]: "التشخيص",
    [normalizeHeaderKey("الطبيب")]: "الطبيب",
    [normalizeHeaderKey("doctor")]: "الطبيب",
    // dates
    [normalizeHeaderKey("تاريخ الحجز")]: "تاريخ الحجز",
    [normalizeHeaderKey("تاريخ الدخول")]: "تاريخ الحجز",
    [normalizeHeaderKey("admission date")]: "تاريخ الحجز",
    [normalizeHeaderKey("تاريخ الإنشاء")]: "تاريخ الإنشاء",
    [normalizeHeaderKey("تاريخ الانشاء")]: "تاريخ الإنشاء",
    [normalizeHeaderKey("created at")]: "تاريخ الإنشاء",

    // discharge sheet (discharges.xlsx)
    [normalizeHeaderKey("تاريخ ووقت الدخول")]: "تاريخ ووقت الدخول",
    [normalizeHeaderKey("تاريخ دخول")]: "تاريخ ووقت الدخول",
    [normalizeHeaderKey("admission datetime")]: "تاريخ ووقت الدخول",
    [normalizeHeaderKey("admission_date")]: "تاريخ ووقت الدخول",

    [normalizeHeaderKey("وقت الدخول")]: "وقت الدخول",
    [normalizeHeaderKey("admission time")]: "وقت الدخول",

    [normalizeHeaderKey("تاريخ ووقت الخروج")]: "تاريخ ووقت الخروج",
    [normalizeHeaderKey("تاريخ الخروج")]: "تاريخ ووقت الخروج",
    [normalizeHeaderKey("discharge datetime")]: "تاريخ ووقت الخروج",
    [normalizeHeaderKey("discharge_date")]: "تاريخ ووقت الخروج",

    [normalizeHeaderKey("وقت الخروج")]: "وقت الخروج",
    [normalizeHeaderKey("discharge time")]: "وقت الخروج",

    [normalizeHeaderKey("حالة الخروج")]: "حالة الخروج",
    [normalizeHeaderKey("discharge status")]: "حالة الخروج",

    [normalizeHeaderKey("مصدر التمويل")]: "مصدر التمويل",
    [normalizeHeaderKey("finance source")]: "مصدر التمويل",

    [normalizeHeaderKey("قسم الخروج")]: "قسم الخروج",
    [normalizeHeaderKey("discharge department")]: "قسم الخروج",

    [normalizeHeaderKey("تشخيص الخروج")]: "تشخيص الخروج",
    [normalizeHeaderKey("discharge diagnosis")]: "تشخيص الخروج",

    [normalizeHeaderKey("تشخيص مصاحب")]: "تشخيص مصاحب",
    [normalizeHeaderKey("secondary discharge diagnosis")]: "تشخيص مصاحب",
    [normalizeHeaderKey("secondary_discharge_diagnosis")]: "تشخيص مصاحب",

    [normalizeHeaderKey("طبيب الخروج")]: "طبيب الخروج",
    [normalizeHeaderKey("discharge doctor")]: "طبيب الخروج",

    [normalizeHeaderKey("رقم قومي طفل")]: "رقم قومي طفل",
    [normalizeHeaderKey("child national id")]: "رقم قومي طفل",
    [normalizeHeaderKey("child_national_id")]: "رقم قومي طفل",

    [normalizeHeaderKey("الرقم الداخلي")]: "الرقم الداخلي",
    [normalizeHeaderKey("internal number")]: "الرقم الداخلي",
    [normalizeHeaderKey("internal_number")]: "الرقم الداخلي",

    // services.xlsx (consolidated events)
    [normalizeHeaderKey("نوع الحدث")]: "نوع الحدث",
    [normalizeHeaderKey("type")]: "نوع الحدث",
    [normalizeHeaderKey("event type")]: "نوع الحدث",

    [normalizeHeaderKey("تاريخ ووقت الحدث")]: "تاريخ ووقت الحدث",
    [normalizeHeaderKey("event_date")]: "تاريخ ووقت الحدث",
    [normalizeHeaderKey("event date")]: "تاريخ ووقت الحدث",

    [normalizeHeaderKey("نوع الإجراء")]: "نوع الإجراء",
    [normalizeHeaderKey("procedure_type")]: "نوع الإجراء",
    [normalizeHeaderKey("procedure type")]: "نوع الإجراء",

    [normalizeHeaderKey("حالة الإجراء")]: "حالة الإجراء",
    [normalizeHeaderKey("procedure_status")]: "حالة الإجراء",
    [normalizeHeaderKey("procedure status")]: "حالة الإجراء",

    [normalizeHeaderKey("قسم التحويل من")]: "قسم التحويل من",
    [normalizeHeaderKey("transferred_from_department")]: "قسم التحويل من",
    [normalizeHeaderKey("transferred from")]: "قسم التحويل من",

    [normalizeHeaderKey("تاريخ ووقت خروج المنظار")]: "تاريخ ووقت خروج المنظار",
    [normalizeHeaderKey("endoscopy discharge date")]: "تاريخ ووقت خروج المنظار",

    [normalizeHeaderKey("حالة خروج المنظار")]: "حالة خروج المنظار",
    [normalizeHeaderKey("endoscopy discharge status")]: "حالة خروج المنظار",

    [normalizeHeaderKey("حالة خروج المنظار الأخرى")]: "حالة خروج المنظار الأخرى",
    [normalizeHeaderKey("discharge_status_other")]: "حالة خروج المنظار الأخرى",
  };

  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const r = aoa[i] ?? [];
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] ?? "";

      const normalized = normalizeHeaderKey(h);
      const canonical = headerAliasMap[normalized];
      if (canonical && !(canonical in obj)) {
        obj[canonical] = r[idx] ?? "";
      }
    });

    // Skip fully empty rows
    const hasAny = Object.values(obj).some((v) => String(v ?? "").trim() !== "");
    if (!hasAny) continue;

    rows.push(obj);
  }

  return { sheetName, headers, rows };
}

export async function parseFirstSheet(file: File): Promise<ParsedExcel> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  return parseFirstSheetFromWorkbook(wb);
}

export async function parseFirstSheetFromArrayBuffer(buf: ArrayBuffer): Promise<ParsedExcel> {
  const wb = XLSX.read(buf, { type: "array" });
  return parseFirstSheetFromWorkbook(wb);
}
