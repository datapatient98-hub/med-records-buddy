import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SearchableSelect from "@/components/SearchableSelect";
import LookupCreateDialog, { LookupCreateType } from "@/components/LookupCreateDialog";
import { FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import ReportsSummary from "@/components/reports/ReportsSummary";
import { toEventRangeIso } from "@/lib/reports/dateRange";
import {
  exportAdmissionsExcel,
  exportDischargesExcel,
  exportEmergenciesExcel,
  exportEndoscopiesExcel,
  exportProceduresExcel,
  exportLoansExcel,
} from "@/lib/excel/exportReportsExcel";

export default function Reports() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [recordType, setRecordType] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [diagnosisFilter, setDiagnosisFilter] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  
  // Quick-add dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogType, setCreateDialogType] = useState<LookupCreateType>("department");

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch diagnoses
  const { data: diagnoses } = useQuery({
    queryKey: ["diagnoses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("diagnoses").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch doctors
  const { data: doctors } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("doctors").select("*");
      if (error) throw error;
      return data;
    },
  });


  // Fetch filtered data - NOW enabled by default
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ["report", startDate, endDate, recordType, departmentFilter, diagnosisFilter, doctorFilter],
    queryFn: async () => {
      if (!startDate || !endDate) {
        return {
          admissions: [],
          discharges: [],
          emergencies: [],
          endoscopies: [],
          procedures: [],
          loans: [],
        };
      }

      const { fromIso, toIso } = toEventRangeIso({ from: startDate, to: endDate });

      const results: any = {
        admissions: [],
        discharges: [],
        emergencies: [],
        endoscopies: [],
        procedures: [],
        loans: [],
      };

      if (recordType === "all" || recordType === "admissions") {
        let query = supabase
          .from("admissions")
          .select(`
            *,
            department:departments(name),
            diagnosis:diagnoses(name),
            doctor:doctors(name)
          `);

        query = query.gte("admission_date", fromIso).lte("admission_date", toIso);
        if (departmentFilter !== "all") query = query.eq("department_id", departmentFilter);
        if (diagnosisFilter !== "all") query = query.eq("diagnosis_id", diagnosisFilter);
        if (doctorFilter !== "all") query = query.eq("doctor_id", doctorFilter);

        const { data, error } = await query;
        if (error) throw error;
        results.admissions = data || [];
      }

      if (recordType === "all" || recordType === "discharges") {
        let query = supabase
          .from("discharges")
          .select(`
            *,
            admission:admissions(patient_name, unified_number, internal_number),
            discharge_department:departments(name),
            discharge_diagnosis:diagnoses(name),
            discharge_doctor:doctors(name)
          `);

        query = query.gte("discharge_date", fromIso).lte("discharge_date", toIso);
        if (departmentFilter !== "all") query = query.eq("discharge_department_id", departmentFilter);
        if (diagnosisFilter !== "all") query = query.eq("discharge_diagnosis_id", diagnosisFilter);
        if (doctorFilter !== "all") query = query.eq("discharge_doctor_id", doctorFilter);

        const { data, error } = await query;
        if (error) throw error;
        results.discharges = data || [];
      }

      if (recordType === "all" || recordType === "emergencies") {
        let query = supabase
          .from("emergencies")
          .select(`
            *,
            department:departments(name),
            diagnosis:diagnoses(name),
            doctor:doctors(name)
          `);

        query = query.gte("visit_date", fromIso).lte("visit_date", toIso);
        if (departmentFilter !== "all") query = query.eq("department_id", departmentFilter);
        if (diagnosisFilter !== "all") query = query.eq("diagnosis_id", diagnosisFilter);
        if (doctorFilter !== "all") query = query.eq("doctor_id", doctorFilter);

        const { data, error } = await query;
        if (error) throw error;
        results.emergencies = data || [];
      }

      if (recordType === "all" || recordType === "endoscopies") {
        let query = supabase
          .from("endoscopies")
          .select(`
            *,
            department:departments(name),
            diagnosis:diagnoses(name),
            doctor:doctors(name)
          `);

        query = query.gte("procedure_date", fromIso).lte("procedure_date", toIso);
        if (departmentFilter !== "all") query = query.eq("department_id", departmentFilter);
        if (diagnosisFilter !== "all") query = query.eq("diagnosis_id", diagnosisFilter);
        if (doctorFilter !== "all") query = query.eq("doctor_id", doctorFilter);

        const { data, error } = await query;
        if (error) throw error;
        results.endoscopies = data || [];
      }

      if (recordType === "all" || recordType === "procedures") {
        let query = supabase
          .from("procedures")
          .select(`
            *,
            department:departments(name),
            diagnosis:diagnoses(name),
            doctor:doctors(name)
          `);

        query = query.gte("procedure_date", fromIso).lte("procedure_date", toIso);
        if (departmentFilter !== "all") query = query.eq("department_id", departmentFilter);
        if (diagnosisFilter !== "all") query = query.eq("diagnosis_id", diagnosisFilter);
        if (doctorFilter !== "all") query = query.eq("doctor_id", doctorFilter);

        const { data, error } = await query;
        if (error) throw error;
        results.procedures = data || [];
      }

      if (recordType === "all" || recordType === "loans") {
        let query = supabase.from("file_loans").select("*");
        query = query.gte("loan_date", fromIso).lte("loan_date", toIso);
        // Loans do not have diagnosis/doctor/department IDs; keep only date filter.
        const { data, error } = await query;
        if (error) throw error;
        results.loans = data || [];
      }

      return results;
    },
    enabled: true, // Changed from false to true
  });

  const lookupMaps = useMemo(() => {
    const departmentsMap: Record<string, string> = {};
    const doctorsMap: Record<string, string> = {};
    const diagnosesMap: Record<string, string> = {};
    (departments ?? []).forEach((d: any) => (departmentsMap[d.id] = d.name));
    (doctors ?? []).forEach((d: any) => (doctorsMap[d.id] = d.name));
    (diagnoses ?? []).forEach((d: any) => (diagnosesMap[d.id] = d.name));
    return { departments: departmentsMap, doctors: doctorsMap, diagnoses: diagnosesMap };
  }, [departments, doctors, diagnoses]);

  const canExport = Boolean(reportData && startDate && endDate);

  const exportByType = (type: string) => {
    if (!reportData || !startDate || !endDate) return;
    const stamp = format(new Date(), "yyyy-MM-dd_HH-mm");
    const rangeLabel = `${startDate}_to_${endDate}`;

    switch (type) {
      case "admissions":
        exportAdmissionsExcel({
          rows: reportData.admissions,
          lookups: lookupMaps,
          fileName: `تقرير_الدخول_${rangeLabel}_${stamp}.xlsx`,
        });
        break;
      case "discharges":
        exportDischargesExcel({
          rows: reportData.discharges,
          lookups: lookupMaps,
          fileName: `تقرير_الخروج_${rangeLabel}_${stamp}.xlsx`,
        });
        break;
      case "emergencies":
        exportEmergenciesExcel({
          rows: reportData.emergencies,
          lookups: lookupMaps,
          fileName: `تقرير_الطوارئ_${rangeLabel}_${stamp}.xlsx`,
        });
        break;
      case "endoscopies":
        exportEndoscopiesExcel({
          rows: reportData.endoscopies,
          lookups: lookupMaps,
          fileName: `تقرير_المناظير_${rangeLabel}_${stamp}.xlsx`,
        });
        break;
      case "procedures":
        exportProceduresExcel({
          rows: reportData.procedures,
          lookups: lookupMaps,
          fileName: `تقرير_الإجراءات_${rangeLabel}_${stamp}.xlsx`,
        });
        break;
      case "loans":
        exportLoansExcel({
          rows: reportData.loans,
          fileName: `تقرير_الاستعارات_${rangeLabel}_${stamp}.xlsx`,
        });
        break;
    }
  };

  return (
    <Layout>
      <LookupCreateDialog
        open={createDialogOpen}
        type={createDialogType}
        onOpenChange={setCreateDialogOpen}
      />
      
      <div className="space-y-6" dir="rtl">
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-3xl font-bold">التقارير</h1>
          <div className="text-sm text-muted-foreground">فلترة حسب تاريخ الحدث (دخول/خروج/زيارة/إجراء/استعارة)</div>
        </header>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>فلاتر التقارير</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">من تاريخ</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">إلى تاريخ</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">نوع التقرير</label>
              <Select value={recordType} onValueChange={setRecordType}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="admissions">الدخول</SelectItem>
                  <SelectItem value="discharges">الخروج</SelectItem>
                  <SelectItem value="emergencies">الطوارئ</SelectItem>
                  <SelectItem value="endoscopies">المناظير</SelectItem>
                  <SelectItem value="procedures">الإجراءات</SelectItem>
                  <SelectItem value="loans">الاستعارات</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">القسم</label>
              <SearchableSelect
                value={departmentFilter}
                onValueChange={setDepartmentFilter}
                options={[{ id: "all", name: "الكل" }, ...((departments ?? []) as any[]).map((d) => ({ id: d.id, name: d.name }))]}
                placeholder="اختر القسم"
                onAddNew={() => {
                  setCreateDialogType("department");
                  setCreateDialogOpen(true);
                }}
                addNewLabel="إضافة قسم"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">التشخيص</label>
              <SearchableSelect
                value={diagnosisFilter}
                onValueChange={setDiagnosisFilter}
                options={[{ id: "all", name: "الكل" }, ...((diagnoses ?? []) as any[]).map((d) => ({ id: d.id, name: d.name }))]}
                placeholder="اختر التشخيص"
                onAddNew={() => {
                  setCreateDialogType("diagnosis");
                  setCreateDialogOpen(true);
                }}
                addNewLabel="إضافة تشخيص"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">الطبيب</label>
              <SearchableSelect
                value={doctorFilter}
                onValueChange={setDoctorFilter}
                options={[{ id: "all", name: "الكل" }, ...((doctors ?? []) as any[]).map((d) => ({ id: d.id, name: d.name }))]}
                placeholder="اختر الطبيب"
                onAddNew={() => {
                  setCreateDialogType("doctor");
                  setCreateDialogOpen(true);
                }}
                addNewLabel="إضافة طبيب"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={() => refetch()} disabled={isLoading || !startDate || !endDate} className="w-full">
                {isLoading ? "جاري التحميل..." : "تحديث"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {reportData && startDate && endDate && (
          <>
            <ReportsSummary
              counts={{
                admissions: reportData.admissions.length,
                discharges: reportData.discharges.length,
                emergencies: reportData.emergencies.length,
                endoscopies: reportData.endoscopies.length,
                procedures: reportData.procedures.length,
                loans: reportData.loans.length,
              }}
            />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>تصدير Excel (ملفات منفصلة)</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => exportByType("admissions")} disabled={!canExport}>
                  <FileSpreadsheet className="ml-2 h-4 w-4" />
                  تصدير الدخول
                </Button>
                <Button type="button" variant="outline" onClick={() => exportByType("discharges")} disabled={!canExport}>
                  <FileSpreadsheet className="ml-2 h-4 w-4" />
                  تصدير الخروج
                </Button>
                <Button type="button" variant="outline" onClick={() => exportByType("emergencies")} disabled={!canExport}>
                  <FileSpreadsheet className="ml-2 h-4 w-4" />
                  تصدير الطوارئ
                </Button>
                <Button type="button" variant="outline" onClick={() => exportByType("endoscopies")} disabled={!canExport}>
                  <FileSpreadsheet className="ml-2 h-4 w-4" />
                  تصدير المناظير
                </Button>
                <Button type="button" variant="outline" onClick={() => exportByType("procedures")} disabled={!canExport}>
                  <FileSpreadsheet className="ml-2 h-4 w-4" />
                  تصدير الإجراءات
                </Button>
                <Button type="button" variant="outline" onClick={() => exportByType("loans")} disabled={!canExport}>
                  <FileSpreadsheet className="ml-2 h-4 w-4" />
                  تصدير الاستعارات
                </Button>
              </CardContent>
            </Card>

            <Tabs defaultValue="admissions" dir="rtl" className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                <TabsTrigger value="admissions">الدخول ({reportData.admissions.length})</TabsTrigger>
                <TabsTrigger value="discharges">الخروج ({reportData.discharges.length})</TabsTrigger>
                <TabsTrigger value="emergencies">الطوارئ ({reportData.emergencies.length})</TabsTrigger>
                <TabsTrigger value="endoscopies">المناظير ({reportData.endoscopies.length})</TabsTrigger>
                <TabsTrigger value="procedures">الإجراءات ({reportData.procedures.length})</TabsTrigger>
                <TabsTrigger value="loans">الاستعارات ({reportData.loans.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="admissions" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>تفاصيل الدخول</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    (تم الإبقاء على عرض التفاصيل كمرحلة أولى؛ لو تحب أضيف جداول تفصيلية + بحث/ترقيم صفحات هنضيفها بعد تأكيدك.)
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="discharges" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>تفاصيل الخروج</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">جاهز للتصدير Excel الآن.</CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="emergencies" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>تفاصيل الطوارئ</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">جاهز للتصدير Excel الآن.</CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="endoscopies" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>تفاصيل المناظير</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">جاهز للتصدير Excel الآن.</CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="procedures" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>تفاصيل الإجراءات</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">جاهز للتصدير Excel الآن.</CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="loans" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>تفاصيل الاستعارات</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">جاهز للتصدير Excel الآن.</CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </Layout>
  );
}