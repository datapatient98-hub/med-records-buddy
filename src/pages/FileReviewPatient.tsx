import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import NotesDialog from "@/components/NotesDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { findUnifiedNumberForTopSearch } from "@/lib/topSearch";

export default function FileReviewPatient() {
  const { toast } = useToast();
  const [params] = useSearchParams();
  const raw = (params.get("q") ?? "").trim();

  const [notesOpen, setNotesOpen] = React.useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["file-review", "patient-admission-discharge", raw],
    enabled: !!raw,
    queryFn: async () => {
      const unifiedNumber = await findUnifiedNumberForTopSearch(supabase, raw);
      if (!unifiedNumber) return { unifiedNumber: null as string | null };

      const { data: admission, error: admErr } = await supabase
        .from("admissions")
        .select(
          `id, unified_number, patient_name, national_id, phone, gender, age, marital_status, address_details, created_at, updated_at, admission_date,
           department:departments(name), doctor:doctors(name), diagnosis:diagnoses(name)`
        )
        .eq("unified_number", unifiedNumber)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (admErr) throw admErr;

      if (!admission?.id) return { unifiedNumber, admission: null as any, discharge: null as any };

      const { data: discharge, error: disErr } = await supabase
        .from("discharges")
        .select(
          `id, internal_number, discharge_date, discharge_status, finance_source, created_at,
           discharge_department:departments(name), discharge_doctor:doctors(name), discharge_diagnosis:diagnoses(name)`
        )
        .eq("admission_id", admission.id)
        .order("discharge_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (disErr) throw disErr;

      return { unifiedNumber, admission, discharge: discharge ?? null };
    },
  });

  React.useEffect(() => {
    if (error) {
      toast({
        title: "خطأ",
        description: (error as any)?.message || "حدث خطأ أثناء تحميل البيانات",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const admission = (data as any)?.admission ?? null;
  const discharge = (data as any)?.discharge ?? null;
  const unifiedNumber = (data as any)?.unifiedNumber ?? null;

  return (
    <Layout>
      <div className="space-y-6">
        <header className="space-y-1">
          <h2 className="text-2xl font-bold text-foreground">بيانات الدخول والخروج (الأحدث)</h2>
          <p className="text-sm text-muted-foreground">
            البحث: <span className="font-mono">{raw || "-"}</span>
          </p>
        </header>

        {!raw && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ابدأ بالبحث</CardTitle>
              <CardDescription>ارجع لصفحة مراجعة الملفات واكتب (قومي/داخلي/موحد) في شريط البحث أعلى الصفحة.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {raw && !isLoading && !unifiedNumber && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">لا توجد نتيجة</CardTitle>
              <CardDescription>لم يتم العثور على مريض مطابق للمدخل.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {raw && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">الدخول (Admission)</CardTitle>
                <CardDescription>أحدث سجل دخول مرتبط بالمريض.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">جاري التحميل...</p>
                ) : !admission ? (
                  <p className="text-sm text-muted-foreground">لا يوجد سجل دخول.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {admission.unified_number}
                      </Badge>
                      <Badge variant="secondary">{admission.department?.name ?? "-"}</Badge>
                      <Button type="button" variant="secondary" onClick={() => setNotesOpen(true)}>
                        ملاحظات
                      </Button>
                    </div>

                    <div className="grid gap-2 text-sm">
                      <Row label="الاسم" value={admission.patient_name} />
                      <Row label="الرقم القومي" value={admission.national_id || "-"} mono />
                      <Row label="الهاتف" value={admission.phone || "-"} mono />
                      <Row label="الطبيب" value={admission.doctor?.name || "-"} />
                      <Row label="التشخيص" value={admission.diagnosis?.name || "-"} />
                      <Row label="تاريخ الدخول" value={fmt(admission.admission_date)} mono />
                      <Row label="آخر تعديل" value={fmt(admission.updated_at)} mono />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">الخروج (Discharge)</CardTitle>
                <CardDescription>أحدث سجل خروج مرتبط بأحدث دخول.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">جاري التحميل...</p>
                ) : !discharge ? (
                  <p className="text-sm text-muted-foreground">لا يوجد سجل خروج لهذا الدخول.</p>
                ) : (
                  <div className="grid gap-2 text-sm">
                    <Row label="الرقم الداخلي" value={String(discharge.internal_number ?? "-")} mono />
                    <Row label="تاريخ الخروج" value={fmt(discharge.discharge_date)} mono />
                    <Row label="الحالة" value={discharge.discharge_status || "-"} />
                    <Row label="القسم" value={discharge.discharge_department?.name || "-"} />
                    <Row label="الطبيب" value={discharge.discharge_doctor?.name || "-"} />
                    <Row label="التشخيص" value={discharge.discharge_diagnosis?.name || "-"} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <NotesDialog
          admissionId={admission?.id ?? null}
          patientName={admission?.patient_name}
          open={notesOpen}
          onOpenChange={setNotesOpen}
        />
      </div>
    </Layout>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-foreground" : "text-foreground"}>{value}</span>
    </div>
  );
}

function fmt(v: any) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("ar-EG");
}
