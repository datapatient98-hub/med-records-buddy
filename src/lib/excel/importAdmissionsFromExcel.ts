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

async function getOrCreateByName(table: LookupTable, name: string, cache: Map<string, string>) {
  const key = normalizeArabicText(name);
  if (!key) return null;

  const existing = cache.get(key);
  if (existing) return existing;

  const { data, error } = await supabase
    .from(table)
    .insert([{ name: name.trim() }])
    .select("id,name")
    .single();

  if (error) throw error;
  const id = (data as any).id as string;
  cache.set(key, id);
  return id;
}

export type AdmissionsImportResult = {
  inserted: number;
  failed: { index: number; reason: string }[];
};

export async function importAdmissionsFromExcel(rows: AdmissionExcelRow[]): Promise<AdmissionsImportResult> {
  const [depMap, govMap, distMap, stationMap, occMap, diagMap, docMap] = await Promise.all([
    loadLookupMap("departments"),
    loadLookupMap("governorates"),
    loadLookupMap("districts"),
    loadLookupMap("stations"),
    loadLookupMap("occupations"),
    loadLookupMap("diagnoses"),
    loadLookupMap("doctors"),
  ]);

  const failed: { index: number; reason: string }[] = [];
  const payloads: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];

    const unified_number = normalizeCellValue(r["الرقم الموحد"]).replace(/\D/g, "");
    const patient_name = normalizeCellValue(r["اسم المريض"]);
    const national_id_raw = normalizeCellValue(r["الرقم القومي"]);
    const national_id = national_id_raw.replace(/\D/g, "");

    const gender = mapGender(r["النوع"]);
    const marital_status = mapMarital(r["الحالة الاجتماعية"]);
    const phone = normalizeCellValue(r["رقم الهاتف"]).replace(/\D/g, "");
    const ageStr = normalizeCellValue(r["السن"]);
    const age = ageStr ? Number(ageStr) : NaN;

    const governorateName = normalizeCellValue(r["المحافظة"]);
    const districtName = normalizeCellValue(r["القسم أو المركز"]);
    const stationName = normalizeCellValue(r["المحطة اللي جاي منها"]);
    const departmentName = normalizeCellValue(r["القسم"]);
    const occupationName = normalizeCellValue(r["المهنة"]);

    const address_details = normalizeCellValue(r["العنوان تفصيلي"]) || null;

    const admission_status = mapAdmissionStatus(r["الحالة"]);
    const diagnosisName = normalizeCellValue(r["التشخيص"]);
    const doctorName = normalizeCellValue(r["الطبيب"]);

    const admission_date = toIsoIfPossible(r["تاريخ الحجز"]);
    const created_at = toIsoIfPossible(r["تاريخ الإنشاء"]);

    if (!unified_number || !patient_name) {
      failed.push({ index: i, reason: "بيانات ناقصة: الرقم الموحد/اسم المريض" });
      continue;
    }
    if (!national_id || national_id.length !== 14) {
      failed.push({ index: i, reason: "الرقم القومي غير صالح (يجب 14 رقم)" });
      continue;
    }
    if (!gender) {
      failed.push({ index: i, reason: "النوع غير معروف" });
      continue;
    }
    if (!marital_status) {
      failed.push({ index: i, reason: "الحالة الاجتماعية غير معروفة" });
      continue;
    }
    if (!phone || phone.length !== 11) {
      failed.push({ index: i, reason: "رقم الهاتف غير صالح (يجب 11 رقم)" });
      continue;
    }
    if (!Number.isFinite(age)) {
      failed.push({ index: i, reason: "السن غير صالح" });
      continue;
    }
    if (!departmentName) {
      failed.push({ index: i, reason: "القسم (Department) مفقود" });
      continue;
    }
    if (!governorateName) {
      failed.push({ index: i, reason: "المحافظة مفقودة" });
      continue;
    }
    if (!admission_status) {
      failed.push({ index: i, reason: "الحالة (Status) غير معروفة" });
      continue;
    }
    if (!admission_date) {
      failed.push({ index: i, reason: "تاريخ الحجز مفقود" });
      continue;
    }

    const governorate_id = await getOrCreateByName("governorates", governorateName, govMap);
    const district_id = districtName
      ? await getOrCreateByName("districts", districtName, distMap)
      : null;
    const station_id = stationName
      ? await getOrCreateByName("stations", stationName, stationMap)
      : null;
    const department_id = await getOrCreateByName("departments", departmentName, depMap);

    const occupation_id = occupationName
      ? await getOrCreateByName("occupations", occupationName, occMap)
      : null;
    const diagnosis_id = diagnosisName
      ? await getOrCreateByName("diagnoses", diagnosisName, diagMap)
      : null;
    const doctor_id = doctorName
      ? await getOrCreateByName("doctors", doctorName, docMap)
      : null;

    payloads.push({
      __rowIndex: i,
      unified_number,
      patient_name,
      national_id,
      gender,
      marital_status,
      phone,
      age: Number(age),
      governorate_id,
      district_id,
      station_id,
      address_details,
      department_id,
      admission_status,
      diagnosis_id,
      doctor_id,
      admission_date,
      ...(created_at ? { created_at } : {}),
    });
  }

  if (payloads.length === 0) return { inserted: 0, failed };

  // Skip rows whose unified_number already exists in DB (unique constraint)
  try {
    const numbers = Array.from(new Set(payloads.map((p) => p.unified_number).filter(Boolean)));
    if (numbers.length > 0) {
      const { data: existing, error: existingErr } = await supabase
        .from("admissions")
        .select("unified_number")
        .in("unified_number", numbers);
      if (existingErr) throw existingErr;

      const existingSet = new Set((existing ?? []).map((r: any) => String(r.unified_number)));
      if (existingSet.size > 0) {
        const nextPayloads: any[] = [];
        for (let i = 0; i < payloads.length; i++) {
          const p = payloads[i];
          if (existingSet.has(String(p.unified_number))) {
            failed.push({ index: Number(p.__rowIndex ?? i), reason: "الرقم الموحد موجود بالفعل (تم تجاهل الصف)" });
            continue;
          }
          nextPayloads.push(p);
        }
        payloads.length = 0;
        payloads.push(...nextPayloads);
      }
    }
  } catch {
    // If this pre-check fails, we still attempt insert and rely on DB error handling below
  }

  if (payloads.length === 0) return { inserted: 0, failed };

  const cleanedPayloads = payloads.map(({ __rowIndex, ...rest }) => rest);

  const { error } = await supabase.from("admissions").insert(cleanedPayloads);
  if (error) {
    const msg = String((error as any)?.message ?? "");
    if (msg.includes("admissions_unified_number_key") || msg.toLowerCase().includes("duplicate key")) {
      throw new Error("يوجد رقم موحد مكرر بالفعل داخل قاعدة البيانات. تم رفض العملية.");
    }
    throw error;
  }

  return { inserted: cleanedPayloads.length, failed };
}
