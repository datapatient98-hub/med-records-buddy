import ExcelSourcePicker from "@/components/ExcelSourcePicker";

export default function ExcelSourcesSettings() {
  return (
    <section className="space-y-4 mx-auto max-w-6xl py-6">
      <header className="space-y-1">
        <h2 className="text-lg font-bold">إعداد مصادر ملفات الإكسل</h2>
        <p className="text-sm text-muted-foreground">
          اختر 3 ملفات فقط (دخول / خروج / خدمات). سيتم تذكّر اختيارك تلقائيًا على هذا الجهاز (في المتصفحات الداعمة).
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <ExcelSourcePicker
          title="ملف الدخول"
          requiredFileName="admissions.xlsx"
          sourceKey="excel_source_admissions"
          className="border border-primary/20 bg-primary/5"
        />

        <ExcelSourcePicker
          title="ملف الخروج"
          requiredFileName="discharges.xlsx"
          sourceKey="excel_source_discharges"
          className="border border-accent/30 bg-accent/10"
        />

        <ExcelSourcePicker
          title="ملف الخدمات (أحداث)"
          requiredFileName="services.xlsx"
          sourceKey="excel_source_services"
          className="border border-secondary/40 bg-secondary/20"
        />
      </div>

      <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">ملف الخدمات (services.xlsx) — Sheet واحدة</p>
        <p className="mt-1">
          يحتوي على كل الأحداث (طوارئ / إجراءات / مناظير / استعارات) في ورقة واحدة، مع عمود <span className="font-mono">type</span> يحدد النوع.
        </p>
      </div>
    </section>
  );
}
