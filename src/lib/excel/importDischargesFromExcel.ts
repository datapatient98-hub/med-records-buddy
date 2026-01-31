import { supabase } from "@/integrations/supabase/client";
import { normalizeArabicText, normalizeCellValue } from "@/lib/excel/normalizeArabic";
import { normalizeDepartmentName } from "@/lib/excel/normalizeDepartmentName";

export type DischargeExcelRow = Record<string, unknown>;

type LookupTable = "departments" | "diagnoses" | "doctors" | "hospitals";

export type DischargesImportResult = {
  inserted_discharges: number;
  updated_discharges: number;
  inserted_admissions: number;
  updated_admissions: number;
  failed: { index: number; reason: string }[];
};

const toIsoIfPossible = (v: unknown) => {
  const s = normalizeCellValue(v);
  if (!s) return null;
  const candidate = s.includes(" ") ? s.replace(" ", "T") : s;
  const d = new Date(candidate);
  if (Number.isNaN(d.getTime())) return s; // keep as-is
  return d.toISOString();
};

const toIsoFromDateAndTime = (dateV: unknown, timeV: unknown) => {
  const dateS = normalizeCellValue(dateV);
  const timeS = normalizeCellValue(timeV);
  if (!dateS) return null;
  const candidate = timeS ? `${dateS}T${timeS}` : dateS;
  const d = new Date(candidate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

function getAdmissionDateIsoFromRow(r: DischargeExcelRow): string | null {
  return (
    toIsoIfPossible(r["تاريخ ووقت الدخول"]) ||
    // sometimes this column is named "تاريخ الدخول" and mapped to "تاريخ الحجز" by the shared parser
    toIsoIfPossible(r["تاريخ الحجز"]) ||
    toIsoFromDateAndTime(r["تاريخ الدخول"], r["وقت الدخول"]) ||
    toIsoIfPossible(r["تاريخ الدخول"]) ||
    null
  );
}

function getDischargeDateIsoFromRow(r: DischargeExcelRow): string | null {
  return (
    toIsoIfPossible(r["تاريخ ووقت الخروج"]) ||
    toIsoFromDateAndTime(r["تاريخ الخروج"], r["وقت الخروج"]) ||
    toIsoIfPossible(r["تاريخ الخروج"]) ||
    null
  );
}

async function loadLookupMap(table: LookupTable) {
  try {
    const { data, error } = await supabase.from(table).select("id,name");
    if (error) return new Map<string, string>();
    const map = new Map<string, string>();
    (data ?? []).forEach((item: any) => {
      map.set(normalizeArabicText(item.name), item.id);
    });
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

function mapDischargeStatus(v: unknown): "تحسن" | "تحويل" | "وفاة" | "هروب" | "رفض العلاج" | null {
  const s = normalizeArabicText(normalizeCellValue(v));
  if (!s) return null;
  if (["تحسن"].includes(s)) return "تحسن";
  if (["تحويل"].includes(s)) return "تحويل";
  if (["وفاة", "وفاه"].includes(s)) return "وفاة";
  if (["هروب"].includes(s)) return "هروب";
  if (["رفض العلاج", "رفض العلاج حسب الطلب", "حسب الطلب"].includes(s)) return "رفض العلاج";
  return null;
}

function mapFinanceSource(v: unknown): "تأمين صحي" | "علاج على نفقة الدولة" | "خاص" | null {
  const s = normalizeArabicText(normalizeCellValue(v));
  if (!s) return null;
  if (["تأمين صحي", "تامين صحي"].includes(s)) return "تأمين صحي";
  if (["علاج على نفقة الدولة", "نفقة الدولة", "نفقه الدوله"].includes(s)) return "علاج على نفقة الدولة";
  if (["خاص"].includes(s)) return "خاص";
  return null;
}

function sameIsoDateTime(a: string | null, b: string | null) {
  if (!a || !b) return false;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (Number.isNaN(ta) || Number.isNaN(tb)) return a === b;
  return ta === tb;
}

export async function importDischargesFromExcel(rows: DischargeExcelRow[]): Promise<DischargesImportResult> {
  const failed: DischargesImportResult["failed"] = [];
  let inserted_discharges = 0;
  let updated_discharges = 0;
  let inserted_admissions = 0;
  let updated_admissions = 0;

  // Default department (required for creating new admissions)
  const { data: firstDept } = await supabase.from("departments").select("id").limit(1).maybeSingle();
  const defaultDepartmentId = firstDept?.id ?? null;
  if (!defaultDepartmentId) throw new Error("لا يوجد أقسام في قاعدة البيانات. أضف قسم واحد على الأقل أولاً");

  const [depMap, diagMap, docMap, hospMap] = await Promise.all([
    loadLookupMap("departments"),
    loadLookupMap("diagnoses"),
    loadLookupMap("doctors"),
    loadLookupMap("hospitals"),
  ]);

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      const unified_number = normalizeCellValue(r["الرقم الموحد"]).replace(/\D/g, "");
      const patient_name = normalizeCellValue(r["اسم المريض"]) || null;
      const national_id = normalizeCellValue(r["الرقم القومي"]).replace(/\D/g, "") || null;
      const phone = normalizeCellValue(r["رقم الهاتف"]).replace(/\D/g, "") || null;

      const admission_date_from_file = getAdmissionDateIsoFromRow(r);
      const discharge_date = getDischargeDateIsoFromRow(r);
      const discharge_status = mapDischargeStatus(r["حالة الخروج"]);
      const finance_source = mapFinanceSource(r["مصدر التمويل"]);

      const dischargeDeptName = normalizeDepartmentName(r["قسم الخروج"]);
      const discharge_department_id = dischargeDeptName ? getIdByName(dischargeDeptName, depMap) : null;
      const dischargeDiagnosisName = normalizeCellValue(r["تشخيص الخروج"]) || null;
      const discharge_diagnosis_id = dischargeDiagnosisName ? getIdByName(dischargeDiagnosisName, diagMap) : null;
      const secondaryDiagnosisName = normalizeCellValue(r["تشخيص مصاحب"]) || null;
      const secondary_discharge_diagnosis_id = secondaryDiagnosisName ? getIdByName(secondaryDiagnosisName, diagMap) : null;
      const dischargeDoctorName = normalizeCellValue(r["طبيب الخروج"]) || null;
      const discharge_doctor_id = dischargeDoctorName ? getIdByName(dischargeDoctorName, docMap) : null;
      const hospitalName = normalizeCellValue(r["مستشفى التحويل"]) || null;
      const hospital_id = hospitalName ? getIdByName(hospitalName, hospMap) : null;
      const child_national_id = normalizeCellValue(r["رقم قومي طفل"]).replace(/\D/g, "") || null;

      if (!unified_number) {
        failed.push({ index: i, reason: "الرقم الموحد مفقود" });
        continue;
      }
      if (!discharge_date) {
        failed.push({ index: i, reason: "تاريخ ووقت الخروج غير صالح أو مفقود" });
        continue;
      }
      if (!discharge_status) {
        failed.push({ index: i, reason: "حالة الخروج غير معروفة أو مفقودة" });
        continue;
      }
      if (secondary_discharge_diagnosis_id && discharge_diagnosis_id && secondary_discharge_diagnosis_id === discharge_diagnosis_id) {
        failed.push({ index: i, reason: "تشخيص مصاحب لا يمكن أن يساوي تشخيص الخروج" });
        continue;
      }

      // Find "first admission" for this unified number
      const { data: admissions, error: admErr } = await supabase
        .from("admissions")
        .select("id, admission_date, created_at, internal_number")
        .eq("unified_number", unified_number)
        .order("admission_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
        .limit(1);

      if (admErr) throw admErr;

      let admission_id: string | null = admissions?.[0]?.id ?? null;
      let admission_date_existing: string | null = admissions?.[0]?.admission_date ?? null;
      let admission_internal_number: number | null = admissions?.[0]?.internal_number ?? null;

      // If no admission exists: create one.
      if (!admission_id) {
        const { data: insertedAdm, error: insAdmErr } = await supabase
          .from("admissions")
          .insert([
            {
              unified_number,
              patient_name: patient_name ?? "-",
              national_id: national_id && national_id.length === 14 ? national_id : null,
              phone: phone && phone.length === 11 ? phone : null,
              department_id: discharge_department_id ?? defaultDepartmentId,
              admission_status: "محجوز" as any,
              admission_date: admission_date_from_file,
            },
          ])
          .select("id, admission_date")
          .single();

        if (insAdmErr) throw insAdmErr;
        inserted_admissions += 1;
        admission_id = insertedAdm.id;
        admission_date_existing = insertedAdm.admission_date ?? null;
      } else {
        // If file has admission_date and it differs from the first admission, create a NEW admission row
        if (admission_date_from_file && !sameIsoDateTime(admission_date_existing, admission_date_from_file)) {
          const { data: insertedAdm, error: insAdmErr } = await supabase
            .from("admissions")
            .insert([
              {
                unified_number,
                patient_name: patient_name ?? "-",
                national_id: national_id && national_id.length === 14 ? national_id : null,
                phone: phone && phone.length === 11 ? phone : null,
                department_id: discharge_department_id ?? defaultDepartmentId,
                admission_status: "محجوز" as any,
                admission_date: admission_date_from_file,
              },
            ])
            .select("id")
            .single();

          if (insAdmErr) throw insAdmErr;
          inserted_admissions += 1;
          admission_id = insertedAdm.id;
          admission_internal_number = null;
        } else {
          // Update demographics on the existing first admission (only if provided)
          const patch: any = {};
          if (patient_name) patch.patient_name = patient_name;
          if (national_id && national_id.length === 14) patch.national_id = national_id;
          if (phone && phone.length === 11) patch.phone = phone;
          if (admission_date_from_file && !sameIsoDateTime(admission_date_existing, admission_date_from_file)) {
            // should not happen due to branch above, but keep safe
            patch.admission_date = admission_date_from_file;
          }
          if (Object.keys(patch).length > 0) {
            const { error: upAdmErr } = await supabase.from("admissions").update(patch).eq("id", admission_id);
            if (upAdmErr) throw upAdmErr;
            updated_admissions += 1;
          }
        }
      }

      if (!admission_id) {
        failed.push({ index: i, reason: "تعذر تحديد/إنشاء دخول مرتبط" });
        continue;
      }

      // Upsert discharge: match by (admission_id + discharge_date)
      const { data: existingDis, error: disFindErr } = await supabase
        .from("discharges")
        .select("id, internal_number")
        .eq("admission_id", admission_id)
        .eq("discharge_date", discharge_date)
        .limit(1)
        .maybeSingle();
      if (disFindErr) throw disFindErr;

      if (existingDis?.id) {
        const { error: updErr } = await supabase
          .from("discharges")
          .update({
            discharge_department_id,
            discharge_diagnosis_id,
            secondary_discharge_diagnosis_id,
            discharge_doctor_id,
            discharge_status: discharge_status as any,
            hospital_id,
            finance_source: finance_source as any,
            child_national_id,
          })
          .eq("id", existingDis.id);
        if (updErr) throw updErr;
        updated_discharges += 1;

        // Ensure admission marked as discharge
        const { error: updAdmStatusErr } = await supabase
          .from("admissions")
          .update({ admission_status: "خروج" as any, internal_number: existingDis.internal_number ?? admission_internal_number ?? undefined })
          .eq("id", admission_id);
        if (updAdmStatusErr) throw updAdmStatusErr;
      } else {
        const { data: insertedDis, error: insErr } = await supabase
          .from("discharges")
          .insert([
            {
              admission_id,
              internal_number: admission_internal_number || undefined,
              discharge_date,
              discharge_department_id,
              discharge_diagnosis_id,
              secondary_discharge_diagnosis_id,
              discharge_doctor_id,
              discharge_status: discharge_status as any,
              hospital_id,
              finance_source: finance_source as any,
              child_national_id,
            },
          ])
          .select("internal_number")
          .single();
        if (insErr) throw insErr;
        inserted_discharges += 1;

        const { error: updAdmErr } = await supabase
          .from("admissions")
          .update({ admission_status: "خروج" as any, internal_number: insertedDis?.internal_number ?? admission_internal_number ?? undefined })
          .eq("id", admission_id);
        if (updAdmErr) throw updAdmErr;
      }
    } catch (e: any) {
      const msg = (typeof e?.message === "string" && e.message) || "خطأ أثناء الاستيراد";
      failed.push({ index: i, reason: msg });
    }
  }

  return {
    inserted_discharges,
    updated_discharges,
    inserted_admissions,
    updated_admissions,
    failed,
  };
}
