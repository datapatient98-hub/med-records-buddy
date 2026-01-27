export type ModuleKey = "admission" | "discharge" | "procedures" | "endoscopy";

export type FieldKey = string;

export type FieldRule = {
  visible: boolean;
  required: boolean;
};

export type FieldConfigState = {
  version: 1;
  modules: Record<ModuleKey, Record<FieldKey, FieldRule>>;
};

export const FIELD_CONFIG_STORAGE_KEY = "field_config_v1";

export type FieldDefinition = {
  module: ModuleKey;
  key: FieldKey;
  label: string;
  group?: string;
};

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  // Admission
  { module: "admission", key: "unified_number", label: "الرقم الموحد", group: "بيانات المريض" },
  { module: "admission", key: "patient_name", label: "اسم المريض", group: "بيانات المريض" },
  { module: "admission", key: "national_id", label: "الرقم القومي", group: "بيانات المريض" },
  { module: "admission", key: "phone", label: "الهاتف", group: "بيانات المريض" },
  { module: "admission", key: "gender", label: "النوع", group: "بيانات المريض" },
  { module: "admission", key: "marital_status", label: "الحالة الاجتماعية", group: "بيانات المريض" },
  { module: "admission", key: "age", label: "السن", group: "بيانات المريض" },
  { module: "admission", key: "occupation_id", label: "المهنة", group: "بيانات المريض" },
  { module: "admission", key: "governorate_id", label: "المحافظة", group: "العنوان" },
  { module: "admission", key: "district_id", label: "المركز/الحي", group: "العنوان" },
  { module: "admission", key: "station_id", label: "المحطة", group: "العنوان" },
  { module: "admission", key: "address_details", label: "العنوان تفصيلي", group: "العنوان" },
  { module: "admission", key: "department_id", label: "قسم الحجز", group: "بيانات الحجز" },
  { module: "admission", key: "admission_status", label: "الحالة", group: "بيانات الحجز" },
  { module: "admission", key: "admission_source", label: "مصدر الدخول", group: "بيانات الحجز" },
  { module: "admission", key: "diagnosis_id", label: "التشخيص", group: "بيانات الحجز" },
  { module: "admission", key: "doctor_id", label: "الطبيب", group: "بيانات الحجز" },
  { module: "admission", key: "admission_date", label: "تاريخ الحجز", group: "بيانات الحجز" },

  // Discharge
  { module: "discharge", key: "discharge_date", label: "تاريخ وساعة الخروج", group: "بيانات الخروج" },
  { module: "discharge", key: "discharge_status", label: "حالة الخروج", group: "بيانات الخروج" },
  { module: "discharge", key: "hospital_id", label: "المستشفى (للتحويل)", group: "بيانات الخروج" },
  { module: "discharge", key: "discharge_department_id", label: "قسم الخروج", group: "بيانات الخروج" },
  { module: "discharge", key: "discharge_diagnosis_id", label: "تشخيص الخروج", group: "بيانات الخروج" },
  { module: "discharge", key: "discharge_doctor_id", label: "طبيب الخروج", group: "بيانات الخروج" },
  { module: "discharge", key: "finance_source", label: "الوعاء المالي", group: "بيانات الخروج" },
  { module: "discharge", key: "child_national_id", label: "الرقم القومي للطفل", group: "بيانات الخروج" },

  // Medical procedures (non-endoscopy)
  { module: "procedures", key: "procedure_date", label: "تاريخ وساعة الإجراء", group: "الإجراء" },
  { module: "procedures", key: "diagnosis_id", label: "التشخيص", group: "الإجراء" },
  { module: "procedures", key: "doctor_id", label: "الطبيب", group: "الإجراء" },
  { module: "procedures", key: "discharge_department_id", label: "قسم الخروج", group: "الخروج" },
  { module: "procedures", key: "procedure_status", label: "حالة الخروج", group: "الخروج" },
  { module: "procedures", key: "transferred_from_department_id", label: "تحويل داخل المستشفى", group: "الخروج" },

  // Endoscopy
  { module: "endoscopy", key: "patient_name", label: "اسم المريض", group: "بيانات المريض" },
  { module: "endoscopy", key: "national_id", label: "الرقم القومي", group: "بيانات المريض" },
  { module: "endoscopy", key: "phone", label: "الهاتف", group: "بيانات المريض" },
  { module: "endoscopy", key: "gender", label: "النوع", group: "بيانات المريض" },
  { module: "endoscopy", key: "marital_status", label: "الحالة الاجتماعية", group: "بيانات المريض" },
  { module: "endoscopy", key: "age", label: "السن", group: "بيانات المريض" },
  { module: "endoscopy", key: "occupation_id", label: "المهنة", group: "بيانات المريض" },
  { module: "endoscopy", key: "governorate_id", label: "المحافظة", group: "العنوان" },
  { module: "endoscopy", key: "district_id", label: "المركز/الحي", group: "العنوان" },
  { module: "endoscopy", key: "station_id", label: "المحطة", group: "العنوان" },
  { module: "endoscopy", key: "address_details", label: "العنوان تفصيلي", group: "العنوان" },
  { module: "endoscopy", key: "department_id", label: "قسم المناظير", group: "الإجراء" },
  { module: "endoscopy", key: "admission_date", label: "تاريخ وساعة الدخول", group: "بيانات الدخول" },
  { module: "endoscopy", key: "diagnosis_id", label: "التشخيص", group: "الإجراء" },
  { module: "endoscopy", key: "doctor_id", label: "الطبيب", group: "الإجراء" },
  { module: "endoscopy", key: "discharge_date", label: "تاريخ وساعة الخروج", group: "بيانات الخروج" },
  { module: "endoscopy", key: "discharge_status_mode", label: "وضع حالة الخروج", group: "بيانات الخروج" },
  { module: "endoscopy", key: "discharge_status_other", label: "حالة خروج أخرى", group: "بيانات الخروج" },
  { module: "endoscopy", key: "discharge_department_id", label: "قسم الخروج", group: "بيانات الخروج" },
  { module: "endoscopy", key: "discharge_diagnosis_id", label: "تشخيص الخروج", group: "بيانات الخروج" },
  { module: "endoscopy", key: "discharge_doctor_id", label: "طبيب الخروج", group: "بيانات الخروج" },
];

function def(module: ModuleKey, key: FieldKey, visible: boolean, required: boolean): [FieldKey, FieldRule] {
  return [key, { visible, required }];
}

export function getDefaultFieldConfig(): FieldConfigState {
  return {
    version: 1,
    modules: {
      admission: Object.fromEntries([
        def("admission", "unified_number", true, true),
        def("admission", "patient_name", true, true),
        def("admission", "national_id", true, true),
        def("admission", "gender", true, true),
        def("admission", "marital_status", true, true),
        def("admission", "phone", true, true),
        def("admission", "age", true, true),
        def("admission", "governorate_id", true, true),
        def("admission", "department_id", true, true),
        def("admission", "admission_status", true, true),
        def("admission", "admission_source", true, true),
        def("admission", "admission_date", true, true),
        // optional in UI
        def("admission", "occupation_id", true, false),
        def("admission", "district_id", true, false),
        def("admission", "station_id", true, false),
        def("admission", "address_details", true, false),
        def("admission", "diagnosis_id", true, false),
        def("admission", "doctor_id", true, false),
      ]),
      discharge: Object.fromEntries([
        def("discharge", "discharge_date", true, true),
        def("discharge", "discharge_status", true, true),
        def("discharge", "hospital_id", true, false),
        def("discharge", "discharge_department_id", true, false),
        def("discharge", "discharge_diagnosis_id", true, false),
        def("discharge", "discharge_doctor_id", true, false),
        def("discharge", "finance_source", true, false),
        def("discharge", "child_national_id", true, false),
      ]),
      procedures: Object.fromEntries([
        def("procedures", "procedure_date", true, true),
        def("procedures", "diagnosis_id", true, false),
        def("procedures", "doctor_id", true, false),
        def("procedures", "discharge_department_id", true, false),
        def("procedures", "procedure_status", true, false),
        def("procedures", "transferred_from_department_id", true, false),
      ]),
      endoscopy: Object.fromEntries([
        def("endoscopy", "department_id", true, true),
        def("endoscopy", "patient_name", true, false),
        def("endoscopy", "national_id", true, false),
        def("endoscopy", "phone", true, false),
        def("endoscopy", "gender", true, false),
        def("endoscopy", "marital_status", true, false),
        def("endoscopy", "age", true, false),
        def("endoscopy", "occupation_id", true, false),
        def("endoscopy", "governorate_id", true, false),
        def("endoscopy", "district_id", true, false),
        def("endoscopy", "station_id", true, false),
        def("endoscopy", "address_details", true, false),
        def("endoscopy", "admission_date", true, false),
        def("endoscopy", "diagnosis_id", true, false),
        def("endoscopy", "doctor_id", true, false),
        def("endoscopy", "discharge_date", true, false),
        def("endoscopy", "discharge_status_mode", true, false),
        def("endoscopy", "discharge_status_other", true, false),
        def("endoscopy", "discharge_department_id", true, false),
        def("endoscopy", "discharge_diagnosis_id", true, false),
        def("endoscopy", "discharge_doctor_id", true, false),
      ]),
    },
  };
}

export function safeLoadFieldConfig(): FieldConfigState {
  try {
    const raw = localStorage.getItem(FIELD_CONFIG_STORAGE_KEY);
    if (!raw) return getDefaultFieldConfig();
    const parsed = JSON.parse(raw) as Partial<FieldConfigState>;
    if (parsed?.version !== 1 || !parsed.modules) return getDefaultFieldConfig();

    const defaults = getDefaultFieldConfig();
    // merge defaults (prevents missing keys)
    return {
      version: 1,
      modules: {
        admission: { ...defaults.modules.admission, ...(parsed.modules as any).admission },
        discharge: { ...defaults.modules.discharge, ...(parsed.modules as any).discharge },
        procedures: { ...defaults.modules.procedures, ...(parsed.modules as any).procedures },
        endoscopy: { ...defaults.modules.endoscopy, ...(parsed.modules as any).endoscopy },
      },
    };
  } catch {
    return getDefaultFieldConfig();
  }
}

export function saveFieldConfig(next: FieldConfigState) {
  localStorage.setItem(FIELD_CONFIG_STORAGE_KEY, JSON.stringify(next));
}
