import ExcelSourcePicker from "@/components/ExcelSourcePicker";

export default function ExcelSourcesSettings() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-bold">إعداد مصادر ملفات الإكسل</h2>
        <p className="text-sm text-muted-foreground">
          اختر ملف كل قسم مرة واحدة وسيتم تذكّره تلقائيًا على هذا الجهاز (في المتصفحات الداعمة).
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <ExcelSourcePicker
          title="ملف الدخول"
          requiredFileName="admissions.xlsx"
          sourceKey="excel_source_admissions"
        />

        <ExcelSourcePicker
          title="ملف الخروج"
          requiredFileName="discharges.xlsx"
          sourceKey="excel_source_discharges"
        />

        <ExcelSourcePicker
          title="ملف الطوارئ"
          requiredFileName="emergencies.xlsx"
          sourceKey="excel_source_emergencies"
        />

        <ExcelSourcePicker
          title="ملف المناظير"
          requiredFileName="endoscopies.xlsx"
          sourceKey="excel_source_endoscopies"
        />

        <ExcelSourcePicker
          title="ملف الإجراءات (بذل/استقبال/كلي)"
          requiredFileName="procedures.xlsx"
          sourceKey="excel_source_procedures"
        />

        <ExcelSourcePicker
          title="ملف الاستعارات"
          requiredFileName="file_loans.xlsx"
          sourceKey="excel_source_file_loans"
        />
      </div>
    </section>
  );
}
