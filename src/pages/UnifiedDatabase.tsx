import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Trash2 } from "lucide-react";
import { format } from "date-fns";
import ExcelSourcePicker from "@/components/ExcelSourcePicker";
import UnifiedPatientHistoryDialog, { UnifiedHistoryPayload } from "@/components/UnifiedPatientHistoryDialog";
import UnifiedDatabaseGate from "@/components/UnifiedDatabaseGate";
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

type Lookup = { name: string | null };

type UnifiedRow = {
  unified_number: string;
  patient_name: string | null;
  national_id: string | null;
  phone: string | null;
  last_activity: string | null; // ISO

  // latest admission snapshot
  latest_admission_date: string | null;
  latest_admission_status: string | null;

  // latest discharge (full)
  latest_discharge_date: string | null;
  latest_discharge_status: string | null;
  latest_finance_source: string | null;
  latest_child_national_id: string | null;
  latest_discharge_department: string | null;
  latest_discharge_diagnosis: string | null;
  latest_discharge_doctor: string | null;

  // latest emergency (full)
  latest_emergency_date: string | null;
  latest_emergency_department: string | null;
  latest_emergency_diagnosis: string | null;
  latest_emergency_doctor: string | null;

  // latest endoscopy
  latest_endoscopy_date: string | null;
  latest_endoscopy_department: string | null;
  latest_endoscopy_diagnosis: string | null;
  latest_endoscopy_doctor: string | null;

  // latest procedure
  latest_procedure_date: string | null;
  latest_procedure_department: string | null;
  latest_procedure_diagnosis: string | null;
  latest_procedure_doctor: string | null;

  // latest loan
  latest_loan_date: string | null;
  latest_loan_borrowed_by: string | null;
  latest_loan_to_department: string | null;
  latest_loan_is_returned: boolean | null;
  latest_loan_return_date: string | null;

  counts: {
    admissions: number;
    discharges: number;
    emergencies: number;
    endoscopies: number;
    procedures: number;
    loans: number;
  };
};

function maxIso(a?: string | null, b?: string | null) {
  if (!a) return b ?? null;
  if (!b) return a ?? null;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function pickLatest<T extends Record<string, any>>(rows: T[], dateKey: keyof T): T | null {
  if (!rows.length) return null;
  return rows.reduce((acc, cur) => {
    const ta = acc?.[dateKey] ? new Date(acc[dateKey]).getTime() : 0;
    const tb = cur?.[dateKey] ? new Date(cur[dateKey]).getTime() : 0;
    return tb > ta ? cur : acc;
  }, rows[0] as T);
}

export default function UnifiedDatabase() {
  const [searchTerm, setSearchTerm] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPayload, setHistoryPayload] = useState<UnifiedHistoryPayload | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["unified-database", searchTerm],
    queryFn: async (): Promise<UnifiedRow[]> => {
      let admissionsQuery = supabase
        .from("admissions")
        .select(
          "id, unified_number, patient_name, national_id, phone, admission_date, admission_status"
        )
        .order("admission_date", { ascending: false })
        .limit(500);

      if (searchTerm.trim()) {
        admissionsQuery = admissionsQuery.or(
          `patient_name.ilike.%${searchTerm}%,unified_number.ilike.%${searchTerm}%`
        );
      }

      const { data: admissions, error: admissionsError } = await admissionsQuery;
      if (admissionsError) throw admissionsError;

      const unifiedNumbers = Array.from(new Set((admissions ?? []).map((a) => a.unified_number))).filter(Boolean);
      const admissionIds = (admissions ?? []).map((a) => a.id);
      if (unifiedNumbers.length === 0) return [];

      const [dischargesRes, emergenciesRes, endoscopiesRes, proceduresRes, loansRes] = await Promise.all([
        admissionIds.length
          ? supabase
              .from("discharges")
              .select(
                `id, admission_id, discharge_date, discharge_status, finance_source, child_national_id,
                 discharge_department:departments(name), discharge_diagnosis:diagnoses(name), discharge_doctor:doctors(name)`
              )
              .in("admission_id", admissionIds)
          : Promise.resolve({ data: [], error: null } as any),
        supabase
          .from("emergencies")
          .select(
            `id, unified_number, visit_date,
             department:departments(name), diagnosis:diagnoses(name), doctor:doctors(name)`
          )
          .in("unified_number", unifiedNumbers),
        supabase
          .from("endoscopies")
          .select(
            `id, unified_number, procedure_date,
             department:departments(name), diagnosis:diagnoses(name), doctor:doctors(name)`
          )
          .in("unified_number", unifiedNumbers),
        supabase
          .from("procedures")
          .select(
            `id, unified_number, procedure_date,
             department:departments(name), diagnosis:diagnoses(name), doctor:doctors(name)`
          )
          .in("unified_number", unifiedNumbers),
        supabase
          .from("file_loans")
          .select("id, unified_number, loan_date, borrowed_by, borrowed_to_department, is_returned, return_date")
          .in("unified_number", unifiedNumbers),
      ]);

      if (dischargesRes.error) throw dischargesRes.error;
      if (emergenciesRes.error) throw emergenciesRes.error;
      if (endoscopiesRes.error) throw endoscopiesRes.error;
      if (proceduresRes.error) throw proceduresRes.error;
      if (loansRes.error) throw loansRes.error;

      const discharges = dischargesRes.data ?? [];
      const emergencies = emergenciesRes.data ?? [];
      const endoscopies = endoscopiesRes.data ?? [];
      const procedures = proceduresRes.data ?? [];
      const loans = loansRes.data ?? [];

      const admissionsByUnified = new Map<string, typeof admissions>();
      for (const a of admissions ?? []) {
        const list = admissionsByUnified.get(a.unified_number) ?? [];
        list.push(a);
        admissionsByUnified.set(a.unified_number, list);
      }

      const dischargesByAdmission = new Map<string, typeof discharges>();
      for (const d of discharges) {
        const list = dischargesByAdmission.get(d.admission_id) ?? [];
        list.push(d);
        dischargesByAdmission.set(d.admission_id, list);
      }

      const byUnified = new Map<string, UnifiedRow>();

      for (const un of unifiedNumbers) {
        const admissionsList = admissionsByUnified.get(un) ?? [];
        const latestAdmission = pickLatest(admissionsList as any, "admission_date") as any;

        const dischargeList = admissionsList.flatMap((a) => dischargesByAdmission.get(a.id) ?? []);
        const latestDischarge = pickLatest(dischargeList as any, "discharge_date") as any;

        const emergencyList = emergencies.filter((e) => e.unified_number === un);
        const latestEmergency = pickLatest(emergencyList as any, "visit_date") as any;

        const endoscopyList = endoscopies.filter((e) => e.unified_number === un);
        const latestEndoscopy = pickLatest(endoscopyList as any, "procedure_date") as any;

        const procedureList = procedures.filter((p) => p.unified_number === un);
        const latestProcedure = pickLatest(procedureList as any, "procedure_date") as any;

        const loanList = loans.filter((l) => l.unified_number === un);
        const latestLoan = pickLatest(loanList as any, "loan_date") as any;

        const lastActivity = [
          latestAdmission?.admission_date ?? null,
          latestDischarge?.discharge_date ?? null,
          latestEmergency?.visit_date ?? null,
          latestEndoscopy?.procedure_date ?? null,
          latestProcedure?.procedure_date ?? null,
          latestLoan?.loan_date ?? null,
        ].reduce((acc: string | null, cur: string | null) => maxIso(acc, cur), null);

        byUnified.set(un, {
          unified_number: un,
          patient_name: latestAdmission?.patient_name ?? null,
          national_id: latestAdmission?.national_id ?? null,
          phone: latestAdmission?.phone ?? null,
          last_activity: lastActivity,

          latest_admission_date: latestAdmission?.admission_date ?? null,
          latest_admission_status: latestAdmission?.admission_status ?? null,

          latest_discharge_date: latestDischarge?.discharge_date ?? null,
          latest_discharge_status: latestDischarge?.discharge_status ?? null,
          latest_finance_source: latestDischarge?.finance_source ?? null,
          latest_child_national_id: latestDischarge?.child_national_id ?? null,
          latest_discharge_department: (latestDischarge?.discharge_department as Lookup | undefined)?.name ?? null,
          latest_discharge_diagnosis: (latestDischarge?.discharge_diagnosis as Lookup | undefined)?.name ?? null,
          latest_discharge_doctor: (latestDischarge?.discharge_doctor as Lookup | undefined)?.name ?? null,

          latest_emergency_date: latestEmergency?.visit_date ?? null,
          latest_emergency_department: (latestEmergency?.department as Lookup | undefined)?.name ?? null,
          latest_emergency_diagnosis: (latestEmergency?.diagnosis as Lookup | undefined)?.name ?? null,
          latest_emergency_doctor: (latestEmergency?.doctor as Lookup | undefined)?.name ?? null,

          latest_endoscopy_date: latestEndoscopy?.procedure_date ?? null,
          latest_endoscopy_department: (latestEndoscopy?.department as Lookup | undefined)?.name ?? null,
          latest_endoscopy_diagnosis: (latestEndoscopy?.diagnosis as Lookup | undefined)?.name ?? null,
          latest_endoscopy_doctor: (latestEndoscopy?.doctor as Lookup | undefined)?.name ?? null,

          latest_procedure_date: latestProcedure?.procedure_date ?? null,
          latest_procedure_department: (latestProcedure?.department as Lookup | undefined)?.name ?? null,
          latest_procedure_diagnosis: (latestProcedure?.diagnosis as Lookup | undefined)?.name ?? null,
          latest_procedure_doctor: (latestProcedure?.doctor as Lookup | undefined)?.name ?? null,

          latest_loan_date: latestLoan?.loan_date ?? null,
          latest_loan_borrowed_by: latestLoan?.borrowed_by ?? null,
          latest_loan_to_department: latestLoan?.borrowed_to_department ?? null,
          latest_loan_is_returned: latestLoan?.is_returned ?? null,
          latest_loan_return_date: latestLoan?.return_date ?? null,

          counts: {
            admissions: admissionsList.length,
            discharges: dischargeList.length,
            emergencies: emergencyList.length,
            endoscopies: endoscopyList.length,
            procedures: procedureList.length,
            loans: loanList.length,
          },
        });
      }

      return Array.from(byUnified.values()).sort((a, b) => {
        const ta = a.last_activity ? new Date(a.last_activity).getTime() : 0;
        const tb = b.last_activity ? new Date(b.last_activity).getTime() : 0;
        return tb - ta;
      });
    },
  });

  const rows = useMemo(() => data ?? [], [data]);

  const openHistory = async (unifiedNumber: string) => {
    const [{ data: admissions }, { data: emergencies }, { data: endoscopies }, { data: procedures }, { data: loans }] =
      await Promise.all([
        supabase
          .from("admissions")
          .select("id, unified_number, patient_name, national_id, phone, admission_status, admission_date")
          .eq("unified_number", unifiedNumber)
          .order("admission_date", { ascending: false }),
        supabase
          .from("emergencies")
          .select("id, unified_number, patient_name, national_id, visit_date")
          .eq("unified_number", unifiedNumber)
          .order("visit_date", { ascending: false }),
        supabase
          .from("endoscopies")
          .select("id, unified_number, patient_name, national_id, procedure_date")
          .eq("unified_number", unifiedNumber)
          .order("procedure_date", { ascending: false }),
        supabase
          .from("procedures")
          .select("id, unified_number, patient_name, national_id, procedure_date")
          .eq("unified_number", unifiedNumber)
          .order("procedure_date", { ascending: false }),
        supabase
          .from("file_loans")
          .select("id, unified_number, internal_number, borrowed_by, borrowed_to_department, loan_date, return_date, is_returned")
          .eq("unified_number", unifiedNumber)
          .order("loan_date", { ascending: false }),
      ]);

    const admissionIds = (admissions ?? []).map((a: any) => a.id);
    const { data: discharges } = admissionIds.length
      ? await supabase
          .from("discharges")
          .select("id, admission_id, discharge_date, discharge_status, finance_source, child_national_id")
          .in("admission_id", admissionIds)
          .order("discharge_date", { ascending: false })
      : { data: [] as any[] };

    setHistoryPayload({
      unified_number: unifiedNumber,
      admissions: (admissions as any[]) ?? [],
      discharges: (discharges as any[]) ?? [],
      emergencies: (emergencies as any[]) ?? [],
      endoscopies: (endoscopies as any[]) ?? [],
      procedures: (procedures as any[]) ?? [],
      loans: (loans as any[]) ?? [],
    });
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

    await refetch();
  };

  return (
    <Layout>
      <UnifiedDatabaseGate code="db123">
        <div className="space-y-6">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold">قاعدة البيانات الموحدة</h1>
            <p className="text-sm text-muted-foreground">
              صف واحد لكل رقم موحد (آخر دخول/خروج/طوارئ/مناظير/بذل/استعارات) مع زر لعرض كل التواريخ.
            </p>
          </header>

          <section className="grid gap-3 lg:grid-cols-2">
            <ExcelSourcePicker
              title="ملف الدخول"
              requiredFileName="admissions-report.xlsx"
              sourceKey="excel_source_admissions"
            />
            <ExcelSourcePicker
              title="ملف الخروج"
              requiredFileName="discharges-report.xlsx"
              sourceKey="excel_source_discharges"
            />
            <ExcelSourcePicker
              title="ملف الطوارئ"
              requiredFileName="emergencies-report.xlsx"
              sourceKey="excel_source_emergencies"
            />
            <ExcelSourcePicker
              title="ملف المناظير"
              requiredFileName="endoscopies-report.xlsx"
              sourceKey="excel_source_endoscopies"
            />
            <ExcelSourcePicker
              title="ملف الإجراءات الطبية (البذل)"
              requiredFileName="procedures-report.xlsx"
              sourceKey="excel_source_procedures"
            />
            <ExcelSourcePicker
              title="ملف الاستعارات"
              requiredFileName="file-loans-report.xlsx"
              sourceKey="excel_source_file_loans"
            />
          </section>

          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو الرقم الموحد أو الرقم الداخلي..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>

          <section className="rounded-lg border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الرقم الموحد</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الرقم القومي</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>آخر نشاط</TableHead>

                    <TableHead>آخر دخول</TableHead>
                    <TableHead>حالة الدخول</TableHead>

                    <TableHead>بيانات الخروج (آخر)</TableHead>
                    <TableHead>بيانات الطوارئ (آخر)</TableHead>
                    <TableHead>بيانات المناظير (آخر)</TableHead>
                    <TableHead>بيانات البذل (آخر)</TableHead>
                    <TableHead>بيانات الاستعارات (آخر)</TableHead>

                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center">
                        جاري التحميل...
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center text-destructive">
                        حدث خطأ أثناء تحميل البيانات
                      </TableCell>
                    </TableRow>
                  ) : rows.length ? (
                    rows.map((r) => (
                      <TableRow key={r.unified_number}>
                        <TableCell className="font-mono">{r.unified_number}</TableCell>
                        <TableCell>{r.patient_name ?? "-"}</TableCell>
                        <TableCell className="font-mono">{r.national_id ?? "-"}</TableCell>
                        <TableCell className="font-mono">{r.phone ?? "-"}</TableCell>
                        <TableCell>{r.last_activity ? format(new Date(r.last_activity), "dd/MM/yyyy HH:mm") : "-"}</TableCell>

                        <TableCell>
                          {r.latest_admission_date ? format(new Date(r.latest_admission_date), "dd/MM/yyyy HH:mm") : "-"}
                        </TableCell>
                        <TableCell>{r.latest_admission_status ?? "-"}</TableCell>

                        <TableCell className="min-w-[280px]">
                          <div className="space-y-1 text-xs">
                            <div>تاريخ: {r.latest_discharge_date ? format(new Date(r.latest_discharge_date), "dd/MM/yyyy HH:mm") : "-"}</div>
                            <div>الحالة: {r.latest_discharge_status ?? "-"}</div>
                            <div>التمويل: {r.latest_finance_source ?? "-"}</div>
                            <div>القسم: {r.latest_discharge_department ?? "-"}</div>
                            <div>التشخيص: {r.latest_discharge_diagnosis ?? "-"}</div>
                            <div>الطبيب: {r.latest_discharge_doctor ?? "-"}</div>
                            <div>قومي طفل: {r.latest_child_national_id ?? "-"}</div>
                          </div>
                        </TableCell>

                        <TableCell className="min-w-[220px]">
                          <div className="space-y-1 text-xs">
                            <div>تاريخ: {r.latest_emergency_date ? format(new Date(r.latest_emergency_date), "dd/MM/yyyy HH:mm") : "-"}</div>
                            <div>القسم: {r.latest_emergency_department ?? "-"}</div>
                            <div>التشخيص: {r.latest_emergency_diagnosis ?? "-"}</div>
                            <div>الطبيب: {r.latest_emergency_doctor ?? "-"}</div>
                          </div>
                        </TableCell>

                        <TableCell className="min-w-[220px]">
                          <div className="space-y-1 text-xs">
                            <div>تاريخ: {r.latest_endoscopy_date ? format(new Date(r.latest_endoscopy_date), "dd/MM/yyyy HH:mm") : "-"}</div>
                            <div>القسم: {r.latest_endoscopy_department ?? "-"}</div>
                            <div>التشخيص: {r.latest_endoscopy_diagnosis ?? "-"}</div>
                            <div>الطبيب: {r.latest_endoscopy_doctor ?? "-"}</div>
                          </div>
                        </TableCell>

                        <TableCell className="min-w-[220px]">
                          <div className="space-y-1 text-xs">
                            <div>تاريخ: {r.latest_procedure_date ? format(new Date(r.latest_procedure_date), "dd/MM/yyyy HH:mm") : "-"}</div>
                            <div>القسم: {r.latest_procedure_department ?? "-"}</div>
                            <div>التشخيص: {r.latest_procedure_diagnosis ?? "-"}</div>
                            <div>الطبيب: {r.latest_procedure_doctor ?? "-"}</div>
                          </div>
                        </TableCell>

                        <TableCell className="min-w-[240px]">
                          <div className="space-y-1 text-xs">
                            <div>تاريخ: {r.latest_loan_date ? format(new Date(r.latest_loan_date), "dd/MM/yyyy HH:mm") : "-"}</div>
                            <div>المستعار: {r.latest_loan_borrowed_by ?? "-"}</div>
                            <div>إلى قسم: {r.latest_loan_to_department ?? "-"}</div>
                            <div>تم الإرجاع: {r.latest_loan_is_returned === null ? "-" : r.latest_loan_is_returned ? "نعم" : "لا"}</div>
                            <div>الإرجاع: {r.latest_loan_return_date ? format(new Date(r.latest_loan_return_date), "dd/MM/yyyy HH:mm") : "-"}</div>
                          </div>
                        </TableCell>

                        <TableCell className="text-left whitespace-nowrap">
                          <div className="flex items-center gap-2 justify-end">
                            <Button type="button" variant="outline" onClick={() => openHistory(r.unified_number)}>
                              عرض كل التواريخ
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
                                    سيتم حذف الدخول والخروج والطوارئ والمناظير والبذل والاستعارات لهذا الرقم الموحد نهائيًا.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => {
                                      void deleteUnified(r.unified_number);
                                    }}
                                  >
                                    حذف
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center text-muted-foreground">
                        لا توجد بيانات
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <UnifiedPatientHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} payload={historyPayload} />
        </div>
      </UnifiedDatabaseGate>
    </Layout>
  );
}
