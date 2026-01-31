import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PersistedExcelSourceKey, usePersistentExcelSource } from "@/hooks/usePersistentExcelSource";
import { cn } from "@/lib/utils";
import { Download, FileSpreadsheet, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { uploadExcelSourceFile } from "@/lib/excelSourceRemote";

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
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  React.useEffect(() => {
    setLocalTitle(source.meta.customTitle ?? "");
  }, [source.meta.customTitle]);

  const defaultTemplateHeaders = (required: string) => {
    if (required === "admissions.xlsx") {
      return [
        // المطلوب من المستخدم (بنفس الترتيب)
        "الرقم الموحد (unified_number)",
        "اسم المريض (patient_name)",
        "الرقم القومي (national_id)",
        "النوع (gender)",
        "المهنة (occupation)",
        "الحالة الاجتماعية (marital_status)",
        "رقم الهاتف (phone)",
        "السن (age)",
        "المحافظة (governorate)",
        "القسم أو المركز (district)",
        "العنوان تفصيلي (address_details)",
        "المحطة اللي جاي منها (station)",
        "القسم (department)",
        "التشخيص (diagnosis)",
        "الطبيب (doctor)",
        "تاريخ الحجز (admission_date)",
        "تاريخ الإنشاء (created_at)",

        // أعمدة إضافية اختيارية (Append-only) حتى لا نكسر أي منطق استيراد موجود
        "نوع الدخول: طوارئ/داخلي (admission_source) [اختياري]",
        "حالة الدخول: محجوز/خروج/متوفى/تحويل (admission_status) [اختياري]",
        "آخر تحديث (updated_at) [اختياري]",
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

        // Non-breaking append-only columns (updates)
        "تشخيص مصاحب (secondary_discharge_diagnosis) [اختياري]",
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

      // Non-breaking append-only columns (updates)
      "قسم التحويل من (transferred_from_department) [للإجراءات][اختياري]",
      "مستشفى التحويل (hospital) [اختياري]",
      "حالة خروج المنظار الأخرى (discharge_status_other) [للمناظير][اختياري]",

      // endoscopy discharge details (append-only)
      "تاريخ ووقت دخول المنظار (admission_date) [للمناظير][اختياري]",
      "تاريخ ووقت خروج المنظار (discharge_date) [للمناظير][اختياري]",
      "حالة خروج المنظار (discharge_status) [للمناظير][اختياري]",
      "قسم خروج المنظار (discharge_department) [للمناظير][اختياري]",
      "تشخيص خروج المنظار (discharge_diagnosis) [للمناظير][اختياري]",
      "طبيب خروج المنظار (discharge_doctor) [للمناظير][اختياري]",

      // loan extras
      "اسم المستعير (borrowed_by) [للاستعارات]",
      "الجهة المستعارة إليها (borrowed_to_department) [للاستعارات]",
      "سبب الاستعارة (loan_reason) [للاستعارات]",
      "تاريخ ووقت الاستعارة (loan_date) [للاستعارات]",
      "تم الإرجاع؟ (is_returned) [اختياري]",
      "تاريخ ووقت الإرجاع (return_date) [اختياري]",

      // linkage (append-only)
      "Admission ID (admission_id) [اختياري]",
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

    // Keep the data sheet clean (row 1 = headers) so it remains usable for import.
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "data");

    // Add a notes sheet for guidance without affecting import.
    const notes: (string | number)[][] = [
      ["ملاحظات"],
      [],
      ["- هذا القالب مخصص كـ (Template) لضمان أسماء أعمدة ثابتة."],
      ["- سياسة التحديث: أي أعمدة جديدة تُضاف في نهاية الأعمدة لتفادي كسر ملفات قديمة."],
      ["- في ملف الخدمات: ضع قيمة (type) من: طوارئ / إجراءات / مناظير / استعارات."],
      ["- اترك الحقول غير الخاصة بالنوع فارغة (مثلاً حقول الاستعارة لا تُستخدم مع الطوارئ)."],
      [],
      ["آخر تحديث للقالب:", new Date().toLocaleString("ar-EG")],
    ];
    const wsNotes = XLSX.utils.aoa_to_sheet(notes);
    XLSX.utils.book_append_sheet(workbook, wsNotes, "ملاحظات");

    XLSX.writeFile(workbook, fileName);
  };

  return (
    <Card className={cn("p-4", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;

          (async () => {
            setUploading(true);
            try {
              // Upload to remote storage for "always saved" behavior (works across devices)
              const res = await uploadExcelSourceFile({ key: sourceKey as any, file: f });
              await source.setStorageSource({ fileName: f.name, storageBucket: res.bucket, storagePath: res.path });
              toast.success("تم حفظ الملف بنجاح");
            } catch (err: any) {
              // Fallback: at least remember filename on this device
              await source.setFallbackPickedFile(f.name);
              toast.error(err?.message ?? "تعذر حفظ الملف على التخزين، تم حفظ الاسم فقط على هذا الجهاز");
            } finally {
              setUploading(false);
              // allow choosing same file again
              e.currentTarget.value = "";
            }
          })();
        }}
      />

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
            onClick={async () => {
              if (!source.canPersistHandle) {
                fileInputRef.current?.click();
                return;
              }

              try {
                await source.pick();
              } catch (e) {
                // If the picker fails for any reason, fallback to normal file input.
                console.error("Excel source pick failed, falling back to file input:", e);
                fileInputRef.current?.click();
              }
            }}
            disabled={!source.isReady || uploading}
          >
            {uploading ? "جاري الحفظ..." : "اختيار الملف"}
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
