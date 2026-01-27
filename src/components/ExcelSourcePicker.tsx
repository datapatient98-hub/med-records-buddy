import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PersistedExcelSourceKey, usePersistentExcelSource } from "@/hooks/usePersistentExcelSource";
import { cn } from "@/lib/utils";
import { Download, FileSpreadsheet, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";

type Props = {
  title: string;
  requiredFileName: string;
  sourceKey: PersistedExcelSourceKey;
  className?: string;
};

export default function ExcelSourcePicker({
  title,
  requiredFileName,
  sourceKey,
  className,
}: Props) {
  const source = usePersistentExcelSource(sourceKey);
  const [localTitle, setLocalTitle] = React.useState("");

  React.useEffect(() => {
    setLocalTitle(source.meta.customTitle ?? "");
  }, [source.meta.customTitle]);

  const defaultTemplateHeaders = (required: string) => {
    if (required === "admissions.xlsx") {
      return [
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
        "القسم (department)",
        "التشخيص (diagnosis)",
        "الطبيب (doctor)",
        "نوع الدخول: طوارئ/داخلي (admission_source)",
        "حالة الدخول: محجوز/خروج/متوفى/تحويل (admission_status)",
        "تاريخ ووقت الدخول (admission_date)",
      ];
    }
    if (required === "discharges.xlsx") {
      return [
        "الرقم الموحد (unified_number)",
        "الاسم رباعي (patient_name) [اختياري]",
        "تاريخ ووقت الخروج (discharge_date)",
        "حالة الخروج (discharge_status)",
        "مصدر التمويل (finance_source)",
        "قسم الخروج (discharge_department)",
        "تشخيص الخروج (discharge_diagnosis)",
        "طبيب الخروج (discharge_doctor)",
        "مستشفى التحويل (hospital) [اختياري]",
        "رقم قومي طفل (child_national_id) [اختياري]",
        "الرقم الداخلي (internal_number) [اختياري]",
      ];
    }
    // services.xlsx
    return [
      "نوع الحدث (type) — طوارئ/إجراءات/مناظير/استعارات",
      "الرقم الموحد (unified_number)",
      "الاسم رباعي (patient_name)",
      "الرقم القومي 14 رقم (national_id) [اختياري]",
      "النوع (gender) [اختياري]",
      "الهاتف 11 رقم (phone) [اختياري]",
      "العمر (age) [اختياري]",
      "الحالة الاجتماعية (marital_status) [اختياري]",
      "المهنة (occupation) [اختياري]",
      "المحافظة (governorate) [اختياري]",
      "المركز/الحي (district) [اختياري]",
      "المحطة (station) [اختياري]",
      "العنوان التفصيلي (address_details) [اختياري]",

      // common medical/event fields
      "القسم (department)",
      "التشخيص (diagnosis) [اختياري]",
      "الطبيب (doctor) [اختياري]",
      "تاريخ ووقت الحدث (event_date)",
      "الرقم الداخلي (internal_number) [اختياري]",

      // procedures/endoscopy extras
      "نوع الإجراء (procedure_type) [للإجراءات]",
      "حالة الإجراء (procedure_status) [للإجراءات]",
      "ملاحظات/تفاصيل (notes) [اختياري]",

      // loan extras
      "اسم المستعير (borrowed_by) [للاستعارات]",
      "الجهة المستعارة إليها (borrowed_to_department) [للاستعارات]",
      "تاريخ ووقت الاستعارة (loan_date) [للاستعارات]",
      "تم الإرجاع؟ (is_returned) [اختياري]",
      "تاريخ ووقت الإرجاع (return_date) [اختياري]",
    ];
  };

  const normalizeFileName = (name: string) => {
    const base = name
      .trim()
      .replace(/[\\/:*?\"<>|]+/g, "-")
      .replace(/\s+/g, " ")
      .slice(0, 80);
    if (!base) return "template.xlsx";
    return base.toLowerCase().endsWith(".xlsx") ? base : `${base}.xlsx`;
  };

  const downloadTemplate = () => {
    const title = (source.meta.customTitle ?? "").trim();
    const fileName = normalizeFileName(title || requiredFileName.replace(/\.xlsx$/i, ""));
    const headers = defaultTemplateHeaders(requiredFileName);

    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "data");
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            اسم الملف المطلوب: <span className="font-mono">{requiredFileName}</span>
          </p>

          <div className="pt-2">
            <div className="text-xs text-muted-foreground mb-1">عنوان مخصص للتحميل (اختياري)</div>
            <Input
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={() => void source.setCustomTitle(localTitle)}
              placeholder={`مثال: ${title} يناير`}
              disabled={!source.isReady}
              className="h-9"
            />
          </div>

          {source.hasSource ? (
            <div className="pt-1 text-xs">
              <div className="text-foreground">
                المختار: <span className="font-mono">{source.meta.fileName}</span>
              </div>
              {source.meta.updatedAt ? (
                <div className="text-muted-foreground">آخر تحديث: {new Date(source.meta.updatedAt).toLocaleString("ar-EG")}</div>
              ) : null}
            </div>
          ) : (
            <div className="pt-1 text-xs text-muted-foreground">لم يتم اختيار ملف بعد.</div>
          )}

          {!source.canPersistHandle ? (
            <p className="pt-2 text-xs text-muted-foreground">
              ملاحظة: متصفحك لا يدعم حفظ اختيار الملف تلقائيًا، ستحتاج لاختياره مرة أخرى عند اللزوم.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Button type="button" variant="secondary" onClick={downloadTemplate} disabled={!source.isReady}>
            <Download className="ml-2 h-4 w-4" />
            تحميل قالب
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => source.pick()}
            disabled={!source.isReady}
          >
            اختيار الملف
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="justify-between"
            onClick={() => source.clear()}
            disabled={!source.isReady || !source.hasSource}
          >
            <span>مسح</span>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
