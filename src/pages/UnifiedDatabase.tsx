import { useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Settings, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import UnifiedPatientHistoryDialog, { UnifiedHistoryPayload } from "@/components/UnifiedPatientHistoryDialog";
import UnifiedDatabaseGate from "@/components/UnifiedDatabaseGate";
import UnifiedHistorySummary from "@/components/UnifiedHistory/UnifiedHistorySummary";
import UnifiedHistorySection from "@/components/UnifiedHistory/UnifiedHistorySection";
import type { ColumnDef } from "@/components/UnifiedHistory/types";
import { findUnifiedNumberForTopSearch, fetchUnifiedHistoryPayload } from "@/lib/topSearch";
import { fmtDate } from "@/components/UnifiedHistory/format";
import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ProcedureKind = "بذل" | "استقبال" | "كلي";

function getInternalNumberFromAnyRow(r: any): number | null {
  const v = r?.internal_number;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function computeMostRecentInternalNumber(payload: UnifiedHistoryPayload | null): number | null {
  if (!payload) return null;
  const all = [
    ...(payload?.discharges ?? []),
    ...(payload?.procedures ?? []),
    ...(payload?.endoscopies ?? []),
    ...(payload?.emergencies ?? []),
    ...(payload?.loans ?? []),
  ];
  // prefer the record with latest event date, but fall back to any internal_number found
  const getSortTime = (row: any) => {
    const candidates = [row.discharge_date, row.procedure_date, row.visit_date, row.loan_date, row.created_at, row.updated_at];
    for (const v of candidates) {
      if (!v) continue;
      const t = new Date(v).getTime();
      if (!Number.isNaN(t)) return t;
    }
    return 0;
  };

  const sorted = [...all].sort((a, b) => getSortTime(b) - getSortTime(a));
  for (const r of sorted) {
    const n = getInternalNumberFromAnyRow(r);
    if (n !== null) return n;
  }
  for (const r of all) {
    const n = getInternalNumberFromAnyRow(r);
    if (n !== null) return n;
  }
  return null;
}

export default function UnifiedDatabase() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const lastSearchedRef = useRef<string>("");

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPayload, setHistoryPayload] = useState<UnifiedHistoryPayload | null>(null);

  const mostRecentInternal = useMemo(() => computeMostRecentInternalNumber(historyPayload), [historyPayload]);

  const columns = useMemo(() => {
    return {
      admissions: [
        { key: "internal_number", label: "الرقم الداخلي" },
        { key: "patient_name", label: "الاسم" },
        { key: "national_id", label: "الرقم القومي" },
        { key: "phone", label: "الهاتف" },
        { key: "admission_status", label: "الحالة" },
        { key: "admission_date", label: "تاريخ الدخول", isDate: true },
      ],
      discharges: [
        { key: "internal_number", label: "الرقم الداخلي" },
        { key: "discharge_status", label: "حالة الخروج" },
        { key: "finance_source", label: "مصدر التمويل" },
        { key: "discharge_date", label: "تاريخ الخروج", isDate: true },
      ],
      emergencies: [
        { key: "internal_number", label: "الرقم الداخلي" },
        { key: "patient_name", label: "الاسم" },
        { key: "national_id", label: "الرقم القومي" },
        { key: "phone", label: "الهاتف" },
        { key: "visit_date", label: "تاريخ الزيارة", isDate: true },
      ],
      endoscopies: [
        { key: "internal_number", label: "الرقم الداخلي" },
        { key: "patient_name", label: "الاسم" },
        { key: "national_id", label: "الرقم القومي" },
        { key: "procedure_date", label: "تاريخ المنظار", isDate: true },
      ],
      procedures: [
        { key: "internal_number", label: "الرقم الداخلي" },
        { key: "patient_name", label: "الاسم" },
        { key: "national_id", label: "الرقم القومي" },
        { key: "procedure_date", label: "تاريخ الإجراء", isDate: true },
      ],
      loans: [
        { key: "internal_number", label: "الرقم الداخلي" },
        { key: "borrowed_by", label: "المستعار" },
        { key: "borrowed_to_department", label: "إلى قسم" },
        { key: "loan_date", label: "تاريخ الاستعارة", isDate: true },
        { key: "return_date", label: "تاريخ الإرجاع", isDate: true },
        { key: "is_returned", label: "تم الإرجاع" },
      ],
    } as const;
  }, []);

  const sectionColumns: Record<string, ColumnDef[]> = useMemo(
    () => ({
      admissions: [...columns.admissions],
      emergencies: [...columns.emergencies],
      endoscopies: [...columns.endoscopies],
      procedures: [...columns.procedures],
      discharges: [...columns.discharges],
      loans: [...columns.loans],
    }),
    [columns]
  );

  const runSearch = async (qRaw: string) => {
    const q = (qRaw ?? "").trim();
    if (!q) return;
    if (lastSearchedRef.current === q) return;
    lastSearchedRef.current = q;

    setSearchLoading(true);
    try {
      const unifiedNumber = await findUnifiedNumberForTopSearch(supabase, q);
      if (!unifiedNumber) {
        setHistoryPayload(null);
        setHistoryOpen(false);
        return;
      }
      const payload = await fetchUnifiedHistoryPayload(supabase, unifiedNumber);
      setHistoryPayload(payload);
    } finally {
      setSearchLoading(false);
    }
  };

  const openDialogForCurrent = () => {
    if (!historyPayload?.unified_number) return;
    setHistoryOpen(true);
  };

  const deleteUnified = async (unifiedNumber: string) => {
    // Delete in safe order: discharges -> admissions -> other tables
    const { data: admissions } = await supabase.from("admissions").select("id").eq("unified_number", unifiedNumber);
    const admissionIds = (admissions ?? []).map((a: any) => a.id);

    if (admissionIds.length) {
      await supabase.from("discharges").delete().in("admission_id", admissionIds);
    }

    await Promise.all([
      supabase.from("admissions").delete().eq("unified_number", unifiedNumber),
      supabase.from("emergencies").delete().eq("unified_number", unifiedNumber),
      supabase.from("endoscopies").delete().eq("unified_number", unifiedNumber),
      supabase.from("procedures").delete().eq("unified_number", unifiedNumber),
      supabase.from("file_loans").delete().eq("unified_number", unifiedNumber),
    ]);

    setHistoryPayload(null);
    setHistoryOpen(false);
    setSearchTerm("");
    lastSearchedRef.current = "";
  };

  const proceduresByType = useMemo(() => {
    const all = (historyPayload?.procedures ?? []) as any[];
    const pick = (t: ProcedureKind) => all.filter((r) => (r?.procedure_type ?? "") === t);
    return {
      بذل: pick("بذل"),
      استقبال: pick("استقبال"),
      كلي: pick("كلي"),
    };
  }, [historyPayload]);

  const totalRecords = useMemo(() => {
    const p = historyPayload;
    return (
      (p?.admissions.length ?? 0) +
      (p?.discharges.length ?? 0) +
      (p?.emergencies.length ?? 0) +
      (p?.endoscopies.length ?? 0) +
      (p?.procedures.length ?? 0) +
      (p?.loans.length ?? 0)
    );
  }, [historyPayload]);

  const patientName =
    historyPayload?.admissions?.[0]?.patient_name ??
    historyPayload?.emergencies?.[0]?.patient_name ??
    historyPayload?.endoscopies?.[0]?.patient_name ??
    historyPayload?.procedures?.[0]?.patient_name ??
    "-";

  return (
    <Layout>
      <UnifiedDatabaseGate code="db123">
        <div className="space-y-6">
          <header className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-3xl font-bold">قاعدة البيانات الموحدة</h1>
              <div className="flex gap-2 flex-wrap">
                <Link to="/field-settings">
                  <Button variant="outline" size="sm">
                    <Settings className="ml-2 h-4 w-4" />
                    إدارة الحقول والبيانات الأساسية
                  </Button>
                </Link>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              ابحث بأي بيانات (اسم/رقم موحد/قومي/هاتف/رقم داخلي) وسيظهر Timeline كامل لكل ما حدث للمريض.
            </p>
          </header>

          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="الاسم (حرفي) / الرقم الموحد / الداخلي / القومي / الهاتف"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onBlur={() => void runSearch(searchTerm)}
              className="pr-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => void runSearch(searchTerm)} disabled={searchLoading}>
              {searchLoading ? "جاري البحث..." : "بحث"}
            </Button>
            {historyPayload?.unified_number ? (
              <Button type="button" variant="outline" onClick={openDialogForCurrent}>
                عرض السجل الكامل (نافذة)
              </Button>
            ) : null}
          </div>

          <section className="rounded-lg border bg-card">
            <div className="p-4">
              {!historyPayload ? (
                <Card className="border">
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground font-semibold">ابحث أولاً لعرض Timeline كامل.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="space-y-2">
                    <h2 className="text-xl font-extrabold text-center">Timeline المريض</h2>
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
                      <span className="font-bold text-foreground">{patientName}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="font-semibold">الرقم الموحد: {historyPayload.unified_number}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="font-semibold">الرقم الداخلي الأخير: {mostRecentInternal ?? "-"}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="font-semibold">إجمالي السجلات: {totalRecords}</span>
                    </div>
                    <div className="text-center text-xs text-muted-foreground">
                      آخر تحديث/حدث يتم حسابه داخل نافذة السجل الكامل.
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <ScrollArea className="max-h-[70vh] px-1">
                    <div className="space-y-6 pb-6">
                      <UnifiedHistorySummary unifiedNumber={historyPayload.unified_number} totalRecords={totalRecords} />

                      <UnifiedHistorySection
                        title="سجلات الدخول"
                        tone="green"
                        rows={historyPayload.admissions ?? []}
                        columns={sectionColumns.admissions}
                        emptyMessage="تفاصيل الدخول: لا يوجد"
                      />

                      <UnifiedHistorySection
                        title="سجلات الطوارئ"
                        tone="orange"
                        rows={historyPayload.emergencies ?? []}
                        columns={sectionColumns.emergencies}
                        emptyMessage="تفاصيل الطوارئ: لا يوجد"
                      />

                      <UnifiedHistorySection
                        title="سجلات البذل"
                        tone="purple"
                        rows={proceduresByType["بذل"]}
                        columns={sectionColumns.procedures}
                        emptyMessage="تفاصيل البذل: لا يوجد"
                      />

                      <UnifiedHistorySection
                        title="سجلات الاستقبال"
                        tone="purple"
                        rows={proceduresByType["استقبال"]}
                        columns={sectionColumns.procedures}
                        emptyMessage="تفاصيل الاستقبال: لا يوجد"
                      />

                      <UnifiedHistorySection
                        title="سجلات الكُلى"
                        tone="purple"
                        rows={proceduresByType["كلي"]}
                        columns={sectionColumns.procedures}
                        emptyMessage="تفاصيل الكُلى: لا يوجد"
                      />

                      <UnifiedHistorySection
                        title="سجلات المناظير"
                        tone="cyan"
                        rows={historyPayload.endoscopies ?? []}
                        columns={sectionColumns.endoscopies}
                        emptyMessage="تفاصيل المناظير: لا يوجد"
                      />

                      <UnifiedHistorySection
                        title="سجلات الاستعارات"
                        tone="primary"
                        rows={historyPayload.loans ?? []}
                        columns={sectionColumns.loans}
                        emptyMessage="تفاصيل الاستعارات: لا يوجد"
                      />

                      <UnifiedHistorySection
                        title="سجلات الخروج"
                        tone="pink"
                        rows={historyPayload.discharges ?? []}
                        columns={sectionColumns.discharges}
                        emptyMessage="تفاصيل الخروج: لا يوجد"
                      />

                      <Card className="border">
                        <CardContent className="p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-semibold">
                              آخر رقم داخلي: <span className="font-mono">{mostRecentInternal ?? "-"}</span>
                              {historyPayload?.procedures?.length ? (
                                <span className="text-muted-foreground"> (آخر حدث: {fmtDate(historyPayload.procedures?.[0]?.procedure_date)})</span>
                              ) : null}
                            </div>
                            <div className="flex gap-2">
                              <Button type="button" variant="outline" onClick={openDialogForCurrent}>
                                عرض السجل الكامل
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button type="button" variant="destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>حذف كل بيانات الرقم الموحد؟</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      سيتم حذف الدخول والخروج والطوارئ والمناظير والإجراءات والاستعارات لهذا الرقم الموحد نهائيًا.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => {
                                        void deleteUnified(historyPayload.unified_number);
                                      }}
                                    >
                                      حذف
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          </section>

          <UnifiedPatientHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} payload={historyPayload} />
        </div>
      </UnifiedDatabaseGate>
    </Layout>
  );
}
