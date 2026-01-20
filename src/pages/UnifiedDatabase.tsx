import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import { format } from "date-fns";

type UnifiedRow = {
  unified_number: string;
  patient_name: string | null;
  national_id: string | null;
  phone: string | null;
  last_activity: string | null; // ISO
  latest_admission_date: string | null;
  latest_discharge_date: string | null;
  latest_discharge_status: string | null;
  counts: {
    admissions: number;
    discharges: number;
    emergencies: number;
    endoscopies: number;
    procedures: number;
    loans: number;
  };
};

const REQUIRED_EXCEL_FILES = [
  "admissions-report.xlsx",
  "discharges-report.xlsx",
  "emergencies-report.xlsx",
  "endoscopies-report.xlsx",
  "procedures-report.xlsx",
  "file-loans-report.xlsx",
];

function maxIso(a?: string | null, b?: string | null) {
  if (!a) return b ?? null;
  if (!b) return a ?? null;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

export default function UnifiedDatabase() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["unified-database", searchTerm],
    queryFn: async (): Promise<UnifiedRow[]> => {
      let admissionsQuery = supabase
        .from("admissions")
        .select("id, unified_number, patient_name, national_id, phone, admission_date")
        .order("admission_date", { ascending: false })
        .limit(500);

      if (searchTerm.trim()) {
        admissionsQuery = admissionsQuery.or(
          `patient_name.ilike.%${searchTerm}%,unified_number.ilike.%${searchTerm}%,internal_number.eq.${searchTerm}`
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
              .select("id, admission_id, discharge_date, discharge_status")
              .in("admission_id", admissionIds)
          : Promise.resolve({ data: [], error: null } as any),
        supabase
          .from("emergencies")
          .select("id, unified_number, visit_date")
          .in("unified_number", unifiedNumbers),
        supabase
          .from("endoscopies")
          .select("id, unified_number, procedure_date")
          .in("unified_number", unifiedNumbers),
        supabase
          .from("procedures")
          .select("id, unified_number, procedure_date")
          .in("unified_number", unifiedNumbers),
        supabase
          .from("file_loans")
          .select("id, unified_number, loan_date")
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

        const latestAdmission = admissionsList.reduce((acc, cur) => {
          if (!acc) return cur;
          return new Date(cur.admission_date).getTime() > new Date(acc.admission_date).getTime() ? cur : acc;
        }, admissionsList[0] as any);

        // discharges linked via admission ids
        const dischargeList = admissionsList.flatMap((a) => dischargesByAdmission.get(a.id) ?? []);
        const latestDischarge = dischargeList.reduce((acc, cur) => {
          if (!acc) return cur;
          return new Date(cur.discharge_date).getTime() > new Date(acc.discharge_date).getTime() ? cur : acc;
        }, dischargeList[0] as any);

        const lastActivity = [
          latestAdmission?.admission_date ?? null,
          latestDischarge?.discharge_date ?? null,
          ...emergencies.filter((e) => e.unified_number === un).map((e) => e.visit_date),
          ...endoscopies.filter((e) => e.unified_number === un).map((e) => e.procedure_date),
          ...procedures.filter((p) => p.unified_number === un).map((p) => p.procedure_date),
          ...loans.filter((l) => l.unified_number === un).map((l) => l.loan_date),
        ].reduce((acc: string | null, cur: string | null) => maxIso(acc, cur), null);

        byUnified.set(un, {
          unified_number: un,
          patient_name: latestAdmission?.patient_name ?? null,
          national_id: latestAdmission?.national_id ?? null,
          phone: latestAdmission?.phone ?? null,
          last_activity: lastActivity,
          latest_admission_date: latestAdmission?.admission_date ?? null,
          latest_discharge_date: latestDischarge?.discharge_date ?? null,
          latest_discharge_status: latestDischarge?.discharge_status ?? null,
          counts: {
            admissions: admissionsList.length,
            discharges: dischargeList.length,
            emergencies: emergencies.filter((e) => e.unified_number === un).length,
            endoscopies: endoscopies.filter((e) => e.unified_number === un).length,
            procedures: procedures.filter((p) => p.unified_number === un).length,
            loans: loans.filter((l) => l.unified_number === un).length,
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

  return (
    <Layout>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">قاعدة البيانات الموحدة</h1>
          <p className="text-sm text-muted-foreground">
            صف واحد لكل رقم موحد يجمع (الدخول + الخروج + الطوارئ + المناظير + البذل + الاستعارات).
          </p>
        </header>

        <section className="rounded-lg border bg-card p-4">
          <h2 className="text-base font-semibold">أسماء ملفات الإكسيل المطلوبة</h2>
          <ul className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
            {REQUIRED_EXCEL_FILES.map((f) => (
              <li key={f} className="font-mono">
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            ملاحظة: المتصفح لا يسمح بحفظ “مسار المجلد” الحقيقي للملفات، لكن نقدر نخلي اختيار الملف سهل من نفس المجلد كل مرة.
          </p>
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
                  <TableHead>اسم المريض</TableHead>
                  <TableHead>الرقم القومي</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>آخر نشاط</TableHead>
                  <TableHead>آخر دخول</TableHead>
                  <TableHead>آخر خروج</TableHead>
                  <TableHead>حالة الخروج</TableHead>
                  <TableHead>الدخول</TableHead>
                  <TableHead>الخروج</TableHead>
                  <TableHead>الطوارئ</TableHead>
                  <TableHead>المناظير</TableHead>
                  <TableHead>البذل</TableHead>
                  <TableHead>الاستعارات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center">جاري التحميل...</TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center text-destructive">
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
                      <TableCell>
                        {r.latest_discharge_date ? format(new Date(r.latest_discharge_date), "dd/MM/yyyy HH:mm") : "-"}
                      </TableCell>
                      <TableCell>{r.latest_discharge_status ?? "-"}</TableCell>
                      <TableCell>{r.counts.admissions}</TableCell>
                      <TableCell>{r.counts.discharges}</TableCell>
                      <TableCell>{r.counts.emergencies}</TableCell>
                      <TableCell>{r.counts.endoscopies}</TableCell>
                      <TableCell>{r.counts.procedures}</TableCell>
                      <TableCell>{r.counts.loans}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center text-muted-foreground">
                      لا توجد بيانات
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </Layout>
  );
}
