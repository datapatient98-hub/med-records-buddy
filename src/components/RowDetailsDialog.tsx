import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

type AnyRow = Record<string, any>;

// تجميع الحقول حسب الأقسام
const FIELD_GROUPS = {
  personal: {
    title: "البيانات الشخصية",
    fields: ["patient_name", "unified_number", "national_id", "child_national_id", "phone", "gender", "age", "marital_status", "occupation"],
  },
  location: {
    title: "بيانات العنوان",
    fields: ["governorate", "district", "station", "address_details"],
  },
  admission: {
    title: "بيانات الدخول",
    fields: ["admission_date", "admission_source", "admission_status", "department", "doctor", "diagnosis"],
  },
  discharge: {
    title: "بيانات الخروج",
    fields: ["discharge_date", "discharge_status", "discharge_status_other", "discharge_department", "discharge_doctor", "discharge_diagnosis", "finance_source", "hospital", "internal_number"],
  },
  procedure: {
    title: "بيانات الإجراء",
    fields: ["procedure_date", "procedure_type", "procedure_status", "transferred_from_department"],
  },
  loan: {
    title: "بيانات الاستعارة",
    fields: ["loan_date", "return_date", "is_returned", "borrowed_by", "borrowed_to_department"],
  },
  emergency: {
    title: "بيانات الطوارئ",
    fields: ["visit_date"],
  },
  system: {
    title: "معلومات النظام",
    fields: ["created_at", "updated_at"],
  },
};

const AR_LABELS: Record<string, string> = {
  unified_number: "الرقم الموحد",
  internal_number: "الرقم الداخلي",
  patient_name: "اسم المريض",
  national_id: "الرقم القومي",
  child_national_id: "الرقم القومي (طفل)",
  phone: "رقم الهاتف",
  gender: "النوع",
  age: "السن",
  marital_status: "الحالة الاجتماعية",
  address_details: "العنوان (تفصيلي)",
  admission_source: "مصدر الدخول",
  admission_status: "حالة الدخول",
  admission_date: "تاريخ الدخول",
  discharge_status: "حالة الخروج",
  discharge_status_other: "حالة الخروج (أخرى)",
  discharge_date: "تاريخ الخروج",
  finance_source: "مصدر التمويل",
  procedure_type: "نوع الإجراء",
  procedure_status: "حالة الإجراء",
  procedure_date: "تاريخ الإجراء",
  loan_date: "تاريخ الاستعارة",
  return_date: "تاريخ الإرجاع",
  is_returned: "تم الإرجاع",
  borrowed_by: "المستعير",
  borrowed_to_department: "القسم المستعار إليه",
  created_at: "وقت التسجيل",
  updated_at: "تاريخ التعديل",
  // أسماء للحقول المدمجة (بدلاً من IDs)
  department: "القسم",
  diagnosis: "التشخيص",
  doctor: "الطبيب",
  governorate: "المحافظة",
  district: "المركز",
  station: "الوحدة/القرية",
  occupation: "الوظيفة",
  discharge_department: "قسم الخروج",
  discharge_diagnosis: "تشخيص الخروج",
  discharge_doctor: "طبيب الخروج",
  transferred_from_department: "محول من قسم",
  hospital: "المستشفى المحول إليها",
  visit_date: "تاريخ الزيارة",
};

function toArabicLabel(key: string) {
  if (AR_LABELS[key]) return AR_LABELS[key];
  return null; // إخفاء الحقول غير المعروفة
}

function defaultFormatValue(key: string, value: any) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "نعم" : "لا";

  const k = (key ?? "").toLowerCase();
  if (k.includes("date") || k.includes("_at")) {
    try {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleString("ar-EG", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    } catch {
      // ignore
    }
  }

  if (typeof value === "object") {
    // في حالة وجود كائن (مثل department: {name: "..."})، نعرض الاسم
    if (value && value.name) return String(value.name);
    return "-";
  }

  return String(value);
}

// تحويل البيانات من database format (مع IDs) إلى display format (مع الأسماء)
function transformRowData(row: AnyRow): Record<string, any> {
  const result: Record<string, any> = {};
  
  // معالجة الحقول الأساسية
  Object.keys(row).forEach((key) => {
    const value = row[key];
    
    // تخطي الـ IDs والحقول التقنية
    if (key === "id" || key === "admission_id" || key.endsWith("_id")) {
      return;
    }
    
    // تخطي الكائنات الكبيرة (relations)
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const keys = Object.keys(value);
      if (keys.length > 1) return; // تخطي العلاقات الكبيرة
    }
    
    result[key] = value;
  });
  
  // استخراج الأسماء من الكائنات المرتبطة
  if (row.departments) result.department = row.departments.name;
  if (row.doctors) result.doctor = row.doctors.name;
  if (row.diagnoses) result.diagnosis = row.diagnoses.name;
  if (row.governorates) result.governorate = row.governorates.name;
  if (row.districts) result.district = row.districts.name;
  if (row.stations) result.station = row.stations.name;
  if (row.occupations) result.occupation = row.occupations.name;
  if (row.hospitals) result.hospital = row.hospitals.name;
  
  // حقول الخروج
  if (row.discharge_departments) result.discharge_department = row.discharge_departments.name;
  if (row.discharge_doctors) result.discharge_doctor = row.discharge_doctors.name;
  if (row.discharge_diagnoses) result.discharge_diagnosis = row.discharge_diagnoses.name;
  if (row.transferred_from_departments) result.transferred_from_department = row.transferred_from_departments.name;
  
  return result;
}

export default function RowDetailsDialog({
  open,
  onOpenChange,
  row,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  row: AnyRow | null;
  title: string;
  description?: string;
}) {
  const header = useMemo(() => {
    if (!row) return null;
    const r = transformRowData(row);
    return {
      patient_name: r.patient_name,
      unified_number: r.unified_number,
      national_id: r.national_id,
      phone: r.phone,
      internal_number: r.internal_number,
    };
  }, [row]);

  const groupedData = useMemo(() => {
    if (!row) return [];
    
    const transformedRow = transformRowData(row);
    const groups: Array<{ title: string; fields: Array<{ key: string; label: string; value: any }> }> = [];
    
    // تجميع الحقول حسب الأقسام
    Object.entries(FIELD_GROUPS).forEach(([groupKey, group]) => {
      const fields: Array<{ key: string; label: string; value: any }> = [];
      
      group.fields.forEach((fieldKey) => {
        if (transformedRow.hasOwnProperty(fieldKey)) {
          const label = toArabicLabel(fieldKey);
          if (label) fields.push({ key: fieldKey, label, value: transformedRow[fieldKey] });
        }
      });
      
      if (fields.length > 0) {
        groups.push({ title: group.title, fields });
      }
    });
    
    return groups;
  }, [row]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">{description ?? "عرض كامل لجميع بيانات السجل"}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-auto rounded-lg border bg-card p-4">
          {groupedData.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              لا توجد بيانات متاحة
            </div>
          ) : (
            <div className="space-y-6">
              {header && (
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      { key: "patient_name", label: "اسم المريض", value: header.patient_name },
                      { key: "unified_number", label: "الرقم الموحد", value: header.unified_number },
                      { key: "national_id", label: "الرقم القومي", value: header.national_id },
                      { key: "phone", label: "رقم الهاتف", value: header.phone },
                      { key: "internal_number", label: "الرقم الداخلي", value: header.internal_number },
                    ].map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 rounded-lg bg-background/60 px-4 py-3 border border-border/60">
                        <div className="text-sm font-semibold text-muted-foreground">{f.label}</div>
                        <div className="text-sm font-extrabold text-foreground text-center break-words">
                          {defaultFormatValue(f.key, f.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {groupedData.map((group, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-primary">{group.title}</h3>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {group.fields.map((f, fieldIdx) => (
                      <div 
                        key={fieldIdx} 
                        className="flex items-start justify-between gap-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors px-4 py-3 border border-border/50"
                      >
                        <div className="text-sm font-medium text-muted-foreground min-w-[120px]">
                          {f.label}
                        </div>
                        <div className="text-sm font-semibold text-foreground text-right break-words flex-1">
                          {defaultFormatValue(f.key, f.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {idx < groupedData.length - 1 && <Separator className="my-4" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
