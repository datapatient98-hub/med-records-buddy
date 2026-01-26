import { supabase } from "@/integrations/supabase/client";
import { normalizeArabicText, normalizeCellValue } from "../excel/normalizeArabic";

export type AdmissionExcelRow = Record<string, unknown>;

type LookupTable =
  | "departments"
  | "governorates"
  | "districts"
  | "stations"
  | "occupations"
  | "diagnoses"
  | "doctors";

const toIsoIfPossible = (v: unknown) => {
  const s = normalizeCellValue(v);
  if (!s) return null;
  const candidate = s.includes(" ") ? s.replace(" ", "T") : s;
  const d = new Date(candidate);
  if (Number.isNaN(d.getTime())) return s; // keep as-is; backend may still parse
  return d.toISOString();
};

const mapAdmissionStatus = (v: unknown): "محجوز" | "خروج" | "متوفى" | "تحويل" | null => {
  const s = normalizeArabicText(normalizeCellValue(v));
  if (!s) return null;
  if (["reserved", "محجوز", "حجز", "حجوز"].includes(s)) return "محجوز";
  if (["خروج", "discharged"].includes(s)) return "خروج";
  if (["متوفى", "وفاه", "وفاة", "dead"].includes(s)) return "متوفى";
  if (["تحويل", "transfer"].includes(s)) return "تحويل";
  return null;
};

const mapGender = (v: unknown): "ذكر" | "أنثى" | null => {
  const s = normalizeArabicText(normalizeCellValue(v));
  if (!s) return null;
  if (["ذكر", "male"].includes(s)) return "ذكر";
  if (["انثى", "أنثى", "female"].includes(s)) return "أنثى";
  return null;
};

const mapMarital = (v: unknown): "أعزب" | "متزوج" | "مطلق" | "أرمل" | null => {
  const s = normalizeArabicText(normalizeCellValue(v));
  if (!s) return null;
  if (["اعزب", "أعزب", "single"].includes(s)) return "أعزب";
  if (["متزوج", "married"].includes(s)) return "متزوج";
  if (["مطلق", "divorced"].includes(s)) return "مطلق";
  if (["ارمل", "أرمل", "widowed"].includes(s)) return "أرمل";
  return null;
};

async function loadLookupMap(table: LookupTable) {
  const { data, error } = await supabase.from(table).select("id,name");
  if (error) throw error;

  const map = new Map<string, string>();
  (data ?? []).forEach((item: any) => {
    map.set(normalizeArabicText(item.name), item.id);
  });
  return map;
}

function getIdByName(table: LookupTable, name: string, cache: Map<string, string>): string | null {
  const key = normalizeArabicText(name);
  if (!key) return null;

  const existing = cache.get(key);
  return existing ?? null;
}

export type AdmissionsImportResult = {
  inserted: number;
  failed: { index: number; reason: string }[];
};

export async function importAdmissionsFromExcel(rows: AdmissionExcelRow[]): Promise<AdmissionsImportResult> {
  // تحميل جداول البحث بشكل آمن مع معالجة الأخطاء
  let depMap: Map<string, string>;
  let govMap: Map<string, string>;
  let distMap: Map<string, string>;
  let stationMap: Map<string, string>;
  let occMap: Map<string, string>;
  let diagMap: Map<string, string>;
  let docMap: Map<string, string>;
  let defaultDepartmentId: string | null = null;

  try {
    [depMap, govMap, distMap, stationMap, occMap, diagMap, docMap] = await Promise.all([
      loadLookupMap("departments"),
      loadLookupMap("governorates"),
      loadLookupMap("districts"),
      loadLookupMap("stations"),
      loadLookupMap("occupations"),
      loadLookupMap("diagnoses"),
      loadLookupMap("doctors"),
    ]);
    
    // الحصول على قسم افتراضي (أول قسم في القائمة) لاستخدامه عند عدم وجود قسم صحيح
    if (depMap.size > 0) {
      defaultDepartmentId = Array.from(depMap.values())[0];
    }
  } catch (error: any) {
    console.error("خطأ في تحميل جداول البحث:", error);
    // إذا فشل تحميل الجداول، نحاول الحصول على قسم افتراضي مباشرة من قاعدة البيانات
    const { data: deptData } = await supabase.from("departments").select("id").limit(1).single();
    if (deptData?.id) {
      defaultDepartmentId = deptData.id;
    }
    
    // تهيئة الـ Maps الفارغة
    depMap = new Map();
    govMap = new Map();
    distMap = new Map();
    stationMap = new Map();
    occMap = new Map();
    diagMap = new Map();
    docMap = new Map();
  }

  // إذا لم نتمكن من الحصول على قسم افتراضي، نحصل عليه مباشرة
  if (!defaultDepartmentId) {
    const { data: deptData } = await supabase.from("departments").select("id").limit(1).single();
    if (deptData?.id) {
      defaultDepartmentId = deptData.id;
    } else {
      throw new Error("لا يوجد أقسام في قاعدة البيانات. يجب إضافة قسم واحد على الأقل من صفحة الإعدادات");
    }
  }

  const failed: { index: number; reason: string }[] = [];
  const payloads: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];

    const unified_number = normalizeCellValue(r["الرقم الموحد"]).replace(/\D/g, "");
    const patient_name = normalizeCellValue(r["اسم المريض"]);
    const national_id_raw = normalizeCellValue(r["الرقم القومي"]);
    let national_id = national_id_raw.replace(/\D/g, "");

    let gender = mapGender(r["النوع"]);
    let marital_status = mapMarital(r["الحالة الاجتماعية"]);
    let phone = normalizeCellValue(r["رقم الهاتف"]).replace(/\D/g, "");
    const ageStr = normalizeCellValue(r["السن"]);
    let age = ageStr ? Number(ageStr) : NaN;

    const governorateName = normalizeCellValue(r["المحافظة"]);
    const districtName = normalizeCellValue(r["القسم أو المركز"]);
    const stationName = normalizeCellValue(r["المحطة اللي جاي منها"]);
    const departmentName = normalizeCellValue(r["القسم"]);
    const occupationName = normalizeCellValue(r["المهنة"]);

    const address_details = normalizeCellValue(r["العنوان تفصيلي"]) || null;

    let admission_status = mapAdmissionStatus(r["الحالة"]);
    const diagnosisName = normalizeCellValue(r["التشخيص"]);
    const doctorName = normalizeCellValue(r["الطبيب"]);

    let admission_date = toIsoIfPossible(r["تاريخ الحجز"]);
    const created_at = toIsoIfPossible(r["تاريخ الإنشاء"]);

    if (!unified_number || !patient_name) {
      failed.push({ index: i, reason: "بيانات ناقصة: الرقم الموحد/اسم المريض" });
      continue;
    }

    // التحقق من صحة البيانات - إذا كانت غير صحيحة نتركها null
    if (!national_id || national_id.length !== 14) {
      national_id = "";
    }
    if (!phone || phone.length !== 11) {
      phone = "";
    }
    if (!Number.isFinite(age) || age < 0) {
      age = NaN;
    }

    // محاولة الحصول على القسم، إذا لم يتم العثور عليه نستخدم القسم الافتراضي
    let department_id: string | null = null;
    if (departmentName) {
      department_id = getIdByName("departments", departmentName, depMap);
    }
    
    // إذا لم نجد القسم أو كان فارغاً، نستخدم القسم الافتراضي
    if (!department_id) {
      department_id = defaultDepartmentId;
    }

    // الحقول الاختيارية: إذا لم تكن موجودة نتركها null
    const governorate_id = governorateName ? getIdByName("governorates", governorateName, govMap) : null;
    const district_id = districtName ? getIdByName("districts", districtName, distMap) : null;
    const station_id = stationName ? getIdByName("stations", stationName, stationMap) : null;
    const occupation_id = occupationName
      ? getIdByName("occupations", occupationName, occMap)
      : null;
    const diagnosis_id = diagnosisName
      ? getIdByName("diagnoses", diagnosisName, diagMap)
      : null;
    const doctor_id = doctorName
      ? getIdByName("doctors", doctorName, docMap)
      : null;

    payloads.push({
      __rowIndex: i,
      unified_number,
      patient_name,
      national_id: national_id || null,
      gender: gender || null,
      marital_status: marital_status || null,
      phone: phone || null,
      age: Number.isFinite(age) && age > 0 ? Number(age) : null,
      governorate_id,
      district_id,
      station_id,
      address_details,
      department_id,
      admission_status: admission_status || null,
      occupation_id,
      diagnosis_id,
      doctor_id,
      admission_date: admission_date || null,
      ...(created_at ? { created_at } : {}),
    });
  }

  if (payloads.length === 0) return { inserted: 0, failed };

  // Note: No longer checking for duplicate unified_number since we allow multiple admissions per patient
  // (e.g., Emergency + Inpatient records)
  
  if (payloads.length === 0) return { inserted: 0, failed };

  const cleanedPayloads = payloads.map(({ __rowIndex, ...rest }) => rest);

  // محاولة إدخال دفعة واحدة (الأسرع)
  const { error } = await supabase.from("admissions").insert(cleanedPayloads);
  if (!error) {
    return { inserted: cleanedPayloads.length, failed };
  }

  // في حال وجود تكرار/تعارض (409) نحاول إدخال صف-بصف حتى لا تفشل العملية بالكامل
  // ونحوّل الصفوف المتعارضة إلى أخطاء عربية داخل تقرير الاستيراد.
  const msg = String((error as any)?.message ?? "");
  const isDup = msg.includes("admissions_unified_number_key") || msg.toLowerCase().includes("duplicate key");
  if (!isDup) throw error;

  let inserted = 0;
  for (let i = 0; i < payloads.length; i++) {
    const { __rowIndex, ...rowPayload } = payloads[i];
    const rowIndex = Number(__rowIndex ?? i);
    const { error: rowErr } = await supabase.from("admissions").insert([rowPayload]);
    if (rowErr) {
      const rowMsg = String((rowErr as any)?.message ?? "");
      const rowIsDup =
        rowMsg.includes("admissions_unified_number_key") || rowMsg.toLowerCase().includes("duplicate key");
      failed.push({
        index: rowIndex,
        reason: rowIsDup
          ? "الرقم الموحد موجود بالفعل داخل قاعدة البيانات (تم تجاهل الصف)"
          : "تعذر إدخال الصف بسبب خطأ في قاعدة البيانات",
      });
      continue;
    }
    inserted += 1;
  }

  return { inserted, failed };
}
