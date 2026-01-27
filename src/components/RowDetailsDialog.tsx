import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AnyRow = Record<string, any>;

const AR_LABELS: Record<string, string> = {
  id: "المعرّف",
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
  admission_id: "رقم الدخول (مرجعي)",
  department_id: "القسم (مرجعي)",
  diagnosis_id: "التشخيص (مرجعي)",
  doctor_id: "الطبيب (مرجعي)",
  governorate_id: "المحافظة (مرجعي)",
  district_id: "المركز (مرجعي)",
  station_id: "الوحدة/القرية (مرجعي)",
  occupation_id: "الوظيفة (مرجعي)",
  discharge_department_id: "قسم الخروج (مرجعي)",
  discharge_diagnosis_id: "تشخيص الخروج (مرجعي)",
  discharge_doctor_id: "طبيب الخروج (مرجعي)",
  transferred_from_department_id: "محول من قسم (مرجعي)",
  hospital_id: "المستشفى (مرجعي)",
  visit_date: "تاريخ الزيارة",
};

const HIDDEN_KEYS = new Set([
  // hide internal join objects if present
  "__proto__",
]);

function toArabicLabel(key: string) {
  if (AR_LABELS[key]) return AR_LABELS[key];
  // fallback: beautify snake_case
  return (key ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function defaultFormatValue(key: string, value: any) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "نعم" : "لا";

  const k = (key ?? "").toLowerCase();
  if (k.includes("date") || k.includes("_at")) {
    try {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleString("ar-EG");
      }
    } catch {
      // ignore
    }
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
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
  const entries = useMemo(() => {
    const r = row ?? {};
    return Object.keys(r)
      .sort()
      .filter((k) => !HIDDEN_KEYS.has(k))
      .filter((k) => {
        const v = (r as any)[k];
        // hide huge nested objects (typically relations) to keep it clean
        if (typeof v === "object" && v !== null && !Array.isArray(v)) {
          const keys = Object.keys(v);
          if (keys.length > 0) return false;
        }
        return true;
      })
      .map((k) => [k, (r as any)[k]] as const);
  }, [row]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description ?? "تفاصيل كاملة لكل الحقول."}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-auto rounded-lg border bg-card p-3">
          <div className="grid gap-2 md:grid-cols-2">
            {entries.map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-3 rounded-md bg-secondary/30 px-3 py-2">
                <div className="text-sm text-muted-foreground break-all">{toArabicLabel(k)}</div>
                <div className="text-sm font-medium text-foreground break-all text-right">
                  {defaultFormatValue(k, v)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
