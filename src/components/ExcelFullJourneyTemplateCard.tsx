import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Download, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

function normalizeFileName(name: string) {
  const base = name
    .trim()
    .replace(/[\\/:*?\"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 100);
  if (!base) return "journey-template.xlsx";
  return base.toLowerCase().endsWith(".xlsx") ? base : `${base}.xlsx`;
}

function fullJourneyHeaders() {
  // Template for completeness review only (not for import).
  return [
    // identity + demographics
    "الرقم الموحد (unified_number)",
    "الاسم رباعي (patient_name)",
    "الرقم القومي 14 رقم (national_id)",
    "النوع (gender)",
    "الهاتف 11 رقم (phone)",
    "العمر (age)",
    "الحالة الاجتماعية (marital_status)",
    "المهنة (occupation)",
    "المحافظة (governorate)",
    "المركز/الحي (district)",
    "المحطة (station)",
    "العنوان التفصيلي (address_details)",

    // admission
    "تاريخ ووقت الدخول (admission_date)",
    "نوع الدخول: طوارئ/داخلي (admission_source)",
    "حالة الدخول: محجوز/خروج/متوفى/تحويل (admission_status)",
    "قسم الدخول (department)",
    "تشخيص الدخول (diagnosis)",
    "طبيب الدخول (doctor)",

    // emergency
    "تاريخ ووقت الطوارئ (visit_date)",
    "قسم الطوارئ (emergency_department)",
    "تشخيص الطوارئ (emergency_diagnosis)",
    "طبيب الطوارئ (emergency_doctor)",
    "رقم داخلي للطوارئ (emergency_internal_number)",

    // procedures
    "تاريخ ووقت الإجراء (procedure_date)",
    "نوع الإجراء (procedure_type)",
    "حالة الإجراء (procedure_status)",
    "قسم الإجراء (procedure_department)",
    "قسم التحويل من (transferred_from_department)",
    "تشخيص الإجراء (procedure_diagnosis)",
    "طبيب الإجراء (procedure_doctor)",
    "مستشفى التحويل (procedure_hospital)",
    "رقم داخلي للإجراء (procedure_internal_number)",

    // endoscopy
    "تاريخ ووقت المنظار (endoscopy_date)",
    "قسم المنظار (endoscopy_department)",
    "تشخيص المنظار (endoscopy_diagnosis)",
    "طبيب المنظار (endoscopy_doctor)",
    "رقم داخلي للمنظار (endoscopy_internal_number)",
    "تاريخ ووقت خروج المنظار (endoscopy_discharge_date)",
    "حالة خروج المنظار (endoscopy_discharge_status)",
    "حالة خروج المنظار الأخرى (endoscopy_discharge_status_other)",

    // loans
    "تاريخ ووقت الاستعارة (loan_date)",
    "اسم المستعير (borrowed_by)",
    "الجهة المستعارة إليها (borrowed_to_department)",
    "سبب الاستعارة (loan_reason)",
    "تم الإرجاع؟ (is_returned)",
    "تاريخ ووقت الإرجاع (return_date)",
    "رقم داخلي للاستعارة (loan_internal_number)",

    // discharge
    "تاريخ ووقت الخروج (discharge_date)",
    "حالة الخروج (discharge_status)",
    "مصدر التمويل (finance_source)",
    "قسم الخروج (discharge_department)",
    "تشخيص الخروج (discharge_diagnosis)",
    "طبيب الخروج (discharge_doctor)",
    "مستشفى التحويل (hospital)",
    "رقم قومي طفل (child_national_id)",
    "الرقم الداخلي (internal_number)",

    // system meta
    "تاريخ الإنشاء (created_at)",
    "آخر تحديث (updated_at)",

    // append-only module meta (optional)
    "تاريخ تسجيل الطوارئ (emergency_created_at)",
    "تاريخ تسجيل الإجراء (procedure_created_at)",
    "تاريخ تسجيل المنظار (endoscopy_created_at)",
    "تاريخ تسجيل الاستعارة (loan_created_at)",
    "تاريخ تسجيل الخروج (discharge_created_at)",
  ];
}

export default function ExcelFullJourneyTemplateCard({ className }: { className?: string }) {
  const [customTitle, setCustomTitle] = React.useState("");

  const download = () => {
    const base = customTitle.trim() || "قالب شامل - رحلة المريض";
    const fileName = normalizeFileName(base);

    const worksheet = XLSX.utils.aoa_to_sheet([fullJourneyHeaders()]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "journey");

    const notes: (string | number)[][] = [
      ["ملاحظات"],
      [],
      ["- هذا القالب للمراجعة فقط وليس للاستيراد."],
      ["- سياسة التحديث: يتم إضافة أي حقول جديدة في نهاية الأعمدة لتفادي كسر ملفات قديمة."],
      ["- يمكنك إبقاء الأعمدة غير المتوفرة فارغة، الهدف هو كشف النواقص."],
      [],
      ["آخر تحديث للقالب:", new Date().toLocaleString("ar-EG")],
    ];
    const wsNotes = XLSX.utils.aoa_to_sheet(notes);
    XLSX.utils.book_append_sheet(workbook, wsNotes, "ملاحظات");

    XLSX.writeFile(workbook, fileName);
  };

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">قالب شامل (للمراجعة)</h3>
          </div>
          <p className="text-xs text-muted-foreground max-w-[52ch]">
            قالب واحد للتأكد أن كل بيانات رحلة المريض مكتملة (من الدخول إلى آخر حدث). هذا القالب للمراجعة فقط وليس للاستيراد.
          </p>

          <div className="pt-1">
            <div className="text-xs text-muted-foreground mb-1">عنوان التحميل (اختياري)</div>
            <Input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="مثال: رحلة المريض - مراجعة"
              className="h-9"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button type="button" variant="secondary" onClick={download}>
            <Download className="ml-2 h-4 w-4" />
            تحميل القالب الشامل
          </Button>
        </div>
      </div>
    </Card>
  );
}
