export type PermissionKey =
  | "can_access_dashboard"
  | "can_access_admission"
  | "can_access_discharge"
  | "can_access_medical_procedures"
  | "can_access_loans"
  | "can_access_patient_search"
  | "can_access_records"
  | "can_access_unified_database"
  | "can_access_reports"
  | "can_create_records"
  | "can_update_records"
  | "can_delete_records"
  | "can_export_excel"
  | "can_import_excel"
  | "can_manage_master_data"
  | "can_view_audit_logs"
  | "can_delete_patient_records"
  | "can_manage_users"
  | "can_bypass_department_restriction";

export type TriState = boolean | null; // null = inherit

export type PermissionField = {
  key: PermissionKey;
  label: string;
  group: "pages" | "ops" | "special";
  hint?: string;
};

export const PERMISSION_FIELDS: PermissionField[] = [
  // Pages
  { key: "can_access_dashboard", label: "لوحة التحكم", group: "pages" },
  { key: "can_access_admission", label: "دخول (مرضى)", group: "pages" },
  { key: "can_access_discharge", label: "خروج (مرضى)", group: "pages" },
  { key: "can_access_medical_procedures", label: "الإجراءات الطبية", group: "pages" },
  { key: "can_access_loans", label: "الاستعارات", group: "pages" },
  { key: "can_access_patient_search", label: "مراجعة الملفات", group: "pages" },
  { key: "can_access_records", label: "سجل المرضى", group: "pages" },
  { key: "can_access_unified_database", label: "قاعدة البيانات الموحدة", group: "pages" },
  { key: "can_access_reports", label: "التقارير", group: "pages" },

  // Operations (global)
  {
    key: "can_create_records",
    label: "إنشاء سجلات",
    group: "ops",
    hint: "تنطبق على صفحات الإدخال/الإجراءات وما شابه",
  },
  {
    key: "can_update_records",
    label: "تعديل سجلات",
    group: "ops",
    hint: "تنطبق على الصفحات التي تسمح بالتعديل",
  },
  { key: "can_delete_records", label: "حذف سجلات", group: "ops" },

  // Special
  { key: "can_export_excel", label: "تصدير Excel", group: "special" },
  { key: "can_import_excel", label: "استيراد Excel", group: "special" },
  { key: "can_manage_master_data", label: "إدارة البيانات الأساسية", group: "special" },
  { key: "can_view_audit_logs", label: "عرض سجلات التدقيق", group: "special" },
  { key: "can_delete_patient_records", label: "حذف ملف مريض بالكامل", group: "special" },
  { key: "can_manage_users", label: "إدارة المستخدمين والصلاحيات", group: "special" },
  { key: "can_bypass_department_restriction", label: "تجاوز قيود الأقسام", group: "special" },
];
