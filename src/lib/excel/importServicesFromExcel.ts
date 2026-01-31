import { supabase } from "@/integrations/supabase/client";
import { normalizeArabicText, normalizeCellValue } from "@/lib/excel/normalizeArabic";
import { normalizeDepartmentName } from "@/lib/excel/normalizeDepartmentName";

export type ServicesExcelRow = Record<string, unknown>;

type LookupTable = "departments" | "diagnoses" | "doctors" | "hospitals" | "governorates" | "districts" | "stations" | "occupations";

export type ServicesImportResult = {
  inserted_emergencies: number;
  updated_emergencies: number;
  inserted_procedures: number;
  updated_procedures: number;
  inserted_endoscopies: number;
  updated_endoscopies: number;
  failed: { index: number; reason: string }[];
};

const toIsoIfPossible = (v: unknown) => {
  const s = normalizeCellValue(v);
  if (!s) return null;
  const candidate = s.includes(" ") ? s.replace(" ", "T") : s;
  const d = new Date(candidate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

async function loadLookupMap(table: LookupTable) {
  try {
    const { data, error } = await supabase.from(table).select("id,name");
    if (error) return new Map<string, string>();
    const map = new Map<string, string>();
    (data ?? []).forEach((item: any) => map.set(normalizeArabicText(item.name), item.id));
    return map;
  } catch {
    return new Map<string, string>();
  }
}

function getIdByName(name: string | null, cache: Map<string, string>) {
  const key = normalizeArabicText(name ?? "");
  if (!key) return null;
  return cache.get(key) ?? null;
}

function normalizeType(v: unknown) {
  const s = normalizeArabicText(normalizeCellValue(v));
  if (["طوارئ"].includes(s)) return "طوارئ" as const;
  if (["اجراءات", "إجراءات"].includes(s)) return "إجراءات" as const;
  if (["مناظير"].includes(s)) return "مناظير" as const;
  if (["استعارات"].includes(s)) return "استعارات" as const;
  return null;
}

function toIntOrNull(v: unknown) {
  const s = normalizeCellValue(v).replace(/\D/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

async function getAdmissionSnapshot(unified: string) {
  const { data } = await supabase
    .from("admissions")
    .select("id, patient_name, national_id, phone, gender, marital_status, age, governorate_id, district_id, station_id, occupation_id, address_details, department_id")
    .eq("unified_number", unified)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function importServicesFromExcel(rows: ServicesExcelRow[]): Promise<ServicesImportResult> {
  const failed: ServicesImportResult["failed"] = [];
  let inserted_emergencies = 0;
  let updated_emergencies = 0;
  let inserted_procedures = 0;
  let updated_procedures = 0;
  let inserted_endoscopies = 0;
  let updated_endoscopies = 0;

  const [depMap, diagMap, docMap, hospMap, govMap, distMap, stationMap, occMap] = await Promise.all([
    loadLookupMap("departments"),
    loadLookupMap("diagnoses"),
    loadLookupMap("doctors"),
    loadLookupMap("hospitals"),
    loadLookupMap("governorates"),
    loadLookupMap("districts"),
    loadLookupMap("stations"),
    loadLookupMap("occupations"),
  ]);

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      const unified_number = normalizeCellValue(r["الرقم الموحد"]).replace(/\D/g, "");
      if (!unified_number) {
        failed.push({ index: i, reason: "الرقم الموحد مفقود" });
        continue;
      }

      const type = normalizeType(r["نوع الحدث"]);
      if (!type || type === "استعارات") {
        failed.push({ index: i, reason: "نوع الحدث غير مدعوم في هذه الصفحة" });
        continue;
      }

      const event_date = toIsoIfPossible(r["تاريخ ووقت الحدث"]);
      if (!event_date) {
        failed.push({ index: i, reason: "تاريخ ووقت الحدث غير صالح أو مفقود" });
        continue;
      }

      const internal_number = toIntOrNull(r["الرقم الداخلي"]);

      // Lookups
      const departmentName = normalizeDepartmentName(r["القسم"]);
      const department_id = departmentName ? getIdByName(departmentName, depMap) : null;

      const diagnosisName = normalizeCellValue(r["التشخيص"]) || null;
      const diagnosis_id = diagnosisName ? getIdByName(diagnosisName, diagMap) : null;

      const doctorName = normalizeCellValue(r["الطبيب"]) || null;
      const doctor_id = doctorName ? getIdByName(doctorName, docMap) : null;

      const hospitalName = normalizeCellValue(r["مستشفى التحويل"]) || null;
      const hospital_id = hospitalName ? getIdByName(hospitalName, hospMap) : null;

      const governorateName = normalizeCellValue(r["المحافظة"]) || null;
      const governorate_id = governorateName ? getIdByName(governorateName, govMap) : null;

      const districtName = normalizeCellValue(r["القسم أو المركز"]) || null;
      const district_id = districtName ? getIdByName(districtName, distMap) : null;

      const stationName = normalizeCellValue(r["المحطة اللي جاي منها"]) || null;
      const station_id = stationName ? getIdByName(stationName, stationMap) : null;

      const occupationName = normalizeCellValue(r["المهنة"]) || null;
      const occupation_id = occupationName ? getIdByName(occupationName, occMap) : null;

      const address_details = normalizeCellValue(r["العنوان تفصيلي"]) || null;

      // Demographics (prefer file, fallback to latest admission snapshot)
      const snap = await getAdmissionSnapshot(unified_number);
      const patient_name = normalizeCellValue(r["اسم المريض"]) || snap?.patient_name || "-";
      const national_id_raw = normalizeCellValue(r["الرقم القومي"]).replace(/\D/g, "");
      const phone_raw = normalizeCellValue(r["رقم الهاتف"]).replace(/\D/g, "");
      const national_id = national_id_raw.length === 14 ? national_id_raw : snap?.national_id;
      const phone = phone_raw.length === 11 ? phone_raw : snap?.phone;

      const gender = (normalizeArabicText(normalizeCellValue(r["النوع"])) || "") as any;
      const marital_status = (normalizeArabicText(normalizeCellValue(r["الحالة الاجتماعية"])) || "") as any;
      const ageN = (() => {
        const s = normalizeCellValue(r["السن"]);
        const n = s ? Number(s) : NaN;
        return Number.isFinite(n) ? n : (snap?.age ?? null);
      })();

      if (type === "طوارئ") {
        const depId = department_id ?? snap?.department_id;
        if (!depId) {
          failed.push({ index: i, reason: "قسم الطوارئ مفقود" });
          continue;
        }
        if (!national_id || !phone) {
          failed.push({ index: i, reason: "بيانات إلزامية للطوارئ مفقودة (رقم قومي/هاتف)" });
          continue;
        }

        // Match by internal_number if provided, else by (unified + visit_date)
        const existing = internal_number
          ? await supabase
              .from("emergencies")
              .select("id")
              .eq("unified_number", unified_number)
              .eq("internal_number", internal_number)
              .limit(1)
              .maybeSingle()
          : await supabase
              .from("emergencies")
              .select("id")
              .eq("unified_number", unified_number)
              .eq("visit_date", event_date)
              .limit(1)
              .maybeSingle();

        if (existing.data?.id) {
          const { error } = await supabase
            .from("emergencies")
            .update({
              patient_name,
              national_id,
              phone,
              age: Number(ageN ?? 0),
              gender: snap?.gender ?? gender,
              marital_status: snap?.marital_status ?? marital_status,
              governorate_id: governorate_id ?? snap?.governorate_id,
              district_id: district_id ?? snap?.district_id,
              station_id: station_id ?? snap?.station_id,
              occupation_id: occupation_id ?? snap?.occupation_id,
              address_details: address_details ?? snap?.address_details,
              department_id: depId,
              diagnosis_id,
              doctor_id,
              visit_date: event_date,
              ...(internal_number ? { internal_number } : {}),
            })
            .eq("id", existing.data.id);
          if (error) throw error;
          updated_emergencies += 1;
        } else {
          const { error } = await supabase.from("emergencies").insert([
            {
              unified_number,
              patient_name,
              national_id,
              phone,
              age: Number(ageN ?? 0),
              gender: (snap?.gender ?? gender) as any,
              marital_status: (snap?.marital_status ?? marital_status) as any,
              governorate_id: governorate_id ?? snap?.governorate_id,
              district_id: district_id ?? snap?.district_id,
              station_id: station_id ?? snap?.station_id,
              occupation_id: occupation_id ?? snap?.occupation_id,
              address_details: address_details ?? snap?.address_details,
              department_id: depId,
              diagnosis_id,
              doctor_id,
              visit_date: event_date,
              ...(internal_number ? { internal_number } : {}),
            },
          ]);
          if (error) throw error;
          inserted_emergencies += 1;
        }
      }

      if (type === "إجراءات") {
        const pType = normalizeArabicText(normalizeCellValue(r["نوع الإجراء"]));
        if (!["بذل", "استقبال", "كلي"].includes(pType)) {
          failed.push({ index: i, reason: "نوع الإجراء غير معروف" });
          continue;
        }

        const depId = department_id ?? snap?.department_id;
        if (!depId) {
          failed.push({ index: i, reason: "قسم الإجراء مفقود" });
          continue;
        }
        if (!national_id || !phone || !snap?.gender || !snap?.marital_status || !Number.isFinite(Number(ageN))) {
          failed.push({ index: i, reason: "بيانات إلزامية للإجراءات مفقودة (تأكد من وجود دخول سابق للمريض)" });
          continue;
        }

        const transferredFromName = normalizeDepartmentName(r["قسم التحويل من"]);
        const transferred_from_department_id = transferredFromName ? getIdByName(transferredFromName, depMap) : null;

        const procedure_status = normalizeCellValue(r["حالة الإجراء"]) || null;

        const existing = internal_number
          ? await supabase
              .from("procedures")
              .select("id")
              .eq("unified_number", unified_number)
              .eq("internal_number", internal_number)
              .limit(1)
              .maybeSingle()
          : await supabase
              .from("procedures")
              .select("id")
              .eq("unified_number", unified_number)
              .eq("procedure_type", pType as any)
              .eq("procedure_date", event_date)
              .limit(1)
              .maybeSingle();

        const payload = {
          unified_number,
          patient_name,
          national_id,
          phone,
          age: Number(ageN),
          gender: snap.gender as any,
          marital_status: snap.marital_status as any,
          governorate_id: governorate_id ?? snap.governorate_id,
          district_id: district_id ?? snap.district_id,
          station_id: station_id ?? snap.station_id,
          occupation_id: occupation_id ?? snap.occupation_id,
          address_details: address_details ?? snap.address_details,
          department_id: depId,
          diagnosis_id,
          doctor_id,
          procedure_date: event_date,
          procedure_type: pType as any,
          procedure_status,
          hospital_id,
          transferred_from_department_id,
          ...(internal_number ? { internal_number } : {}),
        };

        if (existing.data?.id) {
          const { error } = await supabase.from("procedures").update(payload).eq("id", existing.data.id);
          if (error) throw error;
          updated_procedures += 1;
        } else {
          const { error } = await supabase.from("procedures").insert([payload]);
          if (error) throw error;
          inserted_procedures += 1;
        }
      }

      if (type === "مناظير") {
        const depId = department_id ?? snap?.department_id;
        if (!depId) {
          failed.push({ index: i, reason: "قسم المناظير مفقود" });
          continue;
        }

        // endoscopies table is more permissive, but procedure_date is required
        const discharge_date = toIsoIfPossible(r["تاريخ ووقت خروج المنظار"]);
        const discharge_status = normalizeCellValue(r["حالة خروج المنظار"]) || null;
        const discharge_status_other = normalizeCellValue(r["حالة خروج المنظار الأخرى"]) || null;

        const existing = internal_number
          ? await supabase
              .from("endoscopies")
              .select("id")
              .eq("unified_number", unified_number)
              .eq("internal_number", internal_number)
              .limit(1)
              .maybeSingle()
          : await supabase
              .from("endoscopies")
              .select("id")
              .eq("unified_number", unified_number)
              .eq("procedure_date", event_date)
              .limit(1)
              .maybeSingle();

        const payload = {
          unified_number,
          patient_name,
          national_id: national_id && national_id.length === 14 ? national_id : snap?.national_id ?? null,
          phone: phone && phone.length === 11 ? phone : snap?.phone ?? null,
          age: Number.isFinite(Number(ageN)) ? Number(ageN) : snap?.age ?? null,
          gender: (snap?.gender ?? null) as any,
          marital_status: (snap?.marital_status ?? null) as any,
          governorate_id: governorate_id ?? snap?.governorate_id ?? null,
          district_id: district_id ?? snap?.district_id ?? null,
          station_id: station_id ?? snap?.station_id ?? null,
          occupation_id: occupation_id ?? snap?.occupation_id ?? null,
          address_details: address_details ?? snap?.address_details ?? null,
          department_id: depId,
          diagnosis_id,
          doctor_id,
          procedure_date: event_date,
          discharge_date,
          discharge_status: (discharge_status as any) || null,
          discharge_status_other,
          discharge_department_id: depId,
          discharge_diagnosis_id: diagnosis_id,
          discharge_doctor_id: doctor_id,
          ...(internal_number ? { internal_number } : {}),
        };

        if (existing.data?.id) {
          const { error } = await supabase.from("endoscopies").update(payload).eq("id", existing.data.id);
          if (error) throw error;
          updated_endoscopies += 1;
        } else {
          const { error } = await supabase.from("endoscopies").insert([payload]);
          if (error) throw error;
          inserted_endoscopies += 1;
        }
      }
    } catch (e: any) {
      failed.push({ index: i, reason: (typeof e?.message === "string" && e.message) || "خطأ أثناء الاستيراد" });
    }
  }

  return {
    inserted_emergencies,
    updated_emergencies,
    inserted_procedures,
    updated_procedures,
    inserted_endoscopies,
    updated_endoscopies,
    failed,
  };
}
