import { useState } from "react";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import SearchableSelect from "@/components/SearchableSelect";
import LookupCreateDialog, { LookupCreateType } from "@/components/LookupCreateDialog";
import { FileDown, FileSpreadsheet, FileX } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

export default function Reports() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [recordType, setRecordType] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [diagnosisFilter, setDiagnosisFilter] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [showUnreturnedLoans, setShowUnreturnedLoans] = useState(false);
  
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

  // Fetch unreturned loans
  const { data: unreturnedLoansData } = useQuery({
    queryKey: ["unreturned-loans-report"],
    queryFn: async () => {
      const { data } = await supabase
        .from("file_loans")
        .select("*, admissions(patient_name, unified_number, internal_number)")
        .eq("is_returned", false)
        .order("loan_date", { ascending: false });
      return data || [];
    },
  });

  // Fetch filtered data - NOW enabled by default
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ["report", startDate, endDate, recordType, departmentFilter, diagnosisFilter, doctorFilter],
    queryFn: async () => {
      const results: any = {
        admissions: [],
        discharges: [],
        emergencies: [],
        endoscopies: [],
        procedures: [],
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

        if (startDate) query = query.gte("created_at", startDate);
        if (endDate) query = query.lte("created_at", endDate);
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

        if (startDate) query = query.gte("created_at", startDate);
        if (endDate) query = query.lte("created_at", endDate);
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

        if (startDate) query = query.gte("created_at", startDate);
        if (endDate) query = query.lte("created_at", endDate);
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

        if (startDate) query = query.gte("created_at", startDate);
        if (endDate) query = query.lte("created_at", endDate);
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

        if (startDate) query = query.gte("created_at", startDate);
        if (endDate) query = query.lte("created_at", endDate);
        if (departmentFilter !== "all") query = query.eq("department_id", departmentFilter);
        if (diagnosisFilter !== "all") query = query.eq("diagnosis_id", diagnosisFilter);
        if (doctorFilter !== "all") query = query.eq("doctor_id", doctorFilter);

        const { data, error } = await query;
        if (error) throw error;
        results.procedures = data || [];
      }

      return results;
    },
    enabled: true, // Changed from false to true
  });

  const handleExportExcel = () => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();

    if (reportData.admissions.length > 0) {
      const ws = XLSX.utils.json_to_sheet(
        reportData.admissions.map((item: any) => ({
          "الرقم الموحد": item.unified_number,
          "الرقم الداخلي": item.internal_number,
          "اسم المريض": item.patient_name,
          "الرقم القومي": item.national_id,
          "النوع": item.gender,
          "السن": item.age,
          "القسم": item.department?.name,
          "الحالة": item.admission_status,
          "التشخيص": item.diagnosis?.name || "-",
          "الطبيب": item.doctor?.name || "-",
          "تاريخ الحجز": format(new Date(item.admission_date), "dd/MM/yyyy HH:mm"),
        }))
      );
      XLSX.utils.book_append_sheet(wb, ws, "الحجوزات");
    }

    if (reportData.discharges.length > 0) {
      const ws = XLSX.utils.json_to_sheet(
        reportData.discharges.map((item: any) => ({
          "الرقم الموحد": item.admission?.unified_number,
          "الرقم الداخلي": item.admission?.internal_number,
          "اسم المريض": item.admission?.patient_name,
          "قسم الخروج": item.discharge_department?.name,
          "تشخيص الخروج": item.discharge_diagnosis?.name,
          "طبيب الخروج": item.discharge_doctor?.name,
          "حالة الخروج": item.discharge_status,
          "الوعاء المالي": item.finance_source || "-",
          "تاريخ الخروج": format(new Date(item.discharge_date), "dd/MM/yyyy HH:mm"),
        }))
      );
      XLSX.utils.book_append_sheet(wb, ws, "الخروج");
    }

    if (reportData.emergencies.length > 0) {
      const ws = XLSX.utils.json_to_sheet(
        reportData.emergencies.map((item: any) => ({
          "الرقم الموحد": item.unified_number,
          "اسم المريض": item.patient_name,
          "القسم": item.department?.name,
          "التشخيص": item.diagnosis?.name || "-",
          "الطبيب": item.doctor?.name || "-",
          "تاريخ الزيارة": format(new Date(item.visit_date), "dd/MM/yyyy HH:mm"),
        }))
      );
      XLSX.utils.book_append_sheet(wb, ws, "الطوارئ");
    }

    if (reportData.endoscopies.length > 0) {
      const ws = XLSX.utils.json_to_sheet(
        reportData.endoscopies.map((item: any) => ({
          "الرقم الموحد": item.unified_number,
          "اسم المريض": item.patient_name,
          "القسم": item.department?.name,
          "التشخيص": item.diagnosis?.name || "-",
          "الطبيب": item.doctor?.name || "-",
          "تاريخ الإجراء": format(new Date(item.procedure_date), "dd/MM/yyyy HH:mm"),
        }))
      );
      XLSX.utils.book_append_sheet(wb, ws, "المناظير");
    }

    if (reportData.procedures.length > 0) {
      const ws = XLSX.utils.json_to_sheet(
        reportData.procedures.map((item: any) => ({
          "الرقم الموحد": item.unified_number,
          "اسم المريض": item.patient_name,
          "القسم": item.department?.name,
          "التشخيص": item.diagnosis?.name || "-",
          "الطبيب": item.doctor?.name || "-",
          "تاريخ الإجراء": format(new Date(item.procedure_date), "dd/MM/yyyy HH:mm"),
        }))
      );
      XLSX.utils.book_append_sheet(wb, ws, "البذل");
    }

    XLSX.writeFile(wb, `تقرير_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <Layout>
      <LookupCreateDialog
        open={createDialogOpen}
        type={createDialogType}
        onOpenChange={setCreateDialogOpen}
      />
      
      <div className="space-y-6" dir="rtl">
        {/* Header with Tabs */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-3xl font-bold">التقارير الطبية</h1>
          
          <div className="flex gap-2">
            <Button
              variant={!showUnreturnedLoans ? "default" : "outline"}
              size="sm"
              onClick={() => setShowUnreturnedLoans(false)}
            >
              التقارير العامة
            </Button>
            <Button
              variant={showUnreturnedLoans ? "default" : "outline"}
              size="sm"
              onClick={() => setShowUnreturnedLoans(true)}
              className="gap-2"
            >
              <FileX className="h-4 w-4" />
              ملفات لم تُرجع ({unreturnedLoansData?.length || 0})
            </Button>
          </div>
        </div>

        {showUnreturnedLoans ? (
          /* Unreturned Loans Section */
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                الملفات المستعارة التي لم تُرجع ({unreturnedLoansData?.length || 0})
              </h2>
              
              {unreturnedLoansData && unreturnedLoansData.length > 0 ? (
                <div className="rounded-lg border bg-card overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الرقم الموحد</TableHead>
                        <TableHead>الرقم الداخلي</TableHead>
                        <TableHead>اسم المريض</TableHead>
                        <TableHead>مستعار بواسطة</TableHead>
                        <TableHead>القسم المستعير</TableHead>
                        <TableHead>تاريخ الاستعارة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unreturnedLoansData.map((loan: any) => (
                        <TableRow key={loan.id}>
                          <TableCell>{loan.unified_number}</TableCell>
                          <TableCell>{loan.internal_number}</TableCell>
                          <TableCell>{loan.admissions?.patient_name}</TableCell>
                          <TableCell>{loan.borrowed_by}</TableCell>
                          <TableCell>{loan.borrowed_to_department}</TableCell>
                          <TableCell>
                            {format(new Date(loan.loan_date), "dd/MM/yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileX className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">جميع الملفات تم إرجاعها ✓</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Regular Reports Section */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">من تاريخ</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">إلى تاريخ</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">نوع السجل</label>
            <Select value={recordType} onValueChange={setRecordType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="admissions">الحجوزات</SelectItem>
                <SelectItem value="discharges">الخروج</SelectItem>
                <SelectItem value="emergencies">الطوارئ</SelectItem>
                <SelectItem value="endoscopies">المناظير</SelectItem>
                <SelectItem value="procedures">البذل</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">القسم</label>
            <SearchableSelect
              value={departmentFilter}
              onValueChange={setDepartmentFilter}
              options={[
                { id: "all", name: "الكل" },
                ...(departments?.map((d) => ({ id: d.id, name: d.name })) || []),
              ]}
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
              options={[
                { id: "all", name: "الكل" },
                ...(diagnoses?.map((d) => ({ id: d.id, name: d.name })) || []),
              ]}
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
              options={[
                { id: "all", name: "الكل" },
                ...(doctors?.map((d) => ({ id: d.id, name: d.name })) || []),
              ]}
              placeholder="اختر الطبيب"
              onAddNew={() => {
                setCreateDialogType("doctor");
                setCreateDialogOpen(true);
              }}
              addNewLabel="إضافة طبيب"
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? "جاري التحميل..." : "تحديث التقرير"}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={!reportData || isLoading}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            تصدير Excel
          </Button>
        </div>


        {reportData && (
          <div className="space-y-6">
            {reportData.admissions.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">الحجوزات ({reportData.admissions.length})</h2>
                <div className="rounded-lg border bg-card overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الرقم الموحد</TableHead>
                        <TableHead>الرقم الداخلي</TableHead>
                        <TableHead>اسم المريض</TableHead>
                        <TableHead>القسم</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>التشخيص</TableHead>
                        <TableHead>الطبيب</TableHead>
                        <TableHead>تاريخ الحجز</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.admissions.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.unified_number}</TableCell>
                          <TableCell>{item.internal_number}</TableCell>
                          <TableCell>{item.patient_name}</TableCell>
                          <TableCell>{item.department?.name}</TableCell>
                          <TableCell>{item.admission_status}</TableCell>
                          <TableCell>{item.diagnosis?.name || "-"}</TableCell>
                          <TableCell>{item.doctor?.name || "-"}</TableCell>
                          <TableCell>
                            {format(new Date(item.admission_date), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {reportData.emergencies.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">الطوارئ ({reportData.emergencies.length})</h2>
                <div className="rounded-lg border bg-card overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الرقم الموحد</TableHead>
                        <TableHead>اسم المريض</TableHead>
                        <TableHead>القسم</TableHead>
                        <TableHead>التشخيص</TableHead>
                        <TableHead>الطبيب</TableHead>
                        <TableHead>تاريخ الزيارة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.emergencies.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.unified_number}</TableCell>
                          <TableCell>{item.patient_name}</TableCell>
                          <TableCell>{item.department?.name}</TableCell>
                          <TableCell>{item.diagnosis?.name || "-"}</TableCell>
                          <TableCell>{item.doctor?.name || "-"}</TableCell>
                          <TableCell>
                            {format(new Date(item.visit_date), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
          </>
        )}
      </div>
    </Layout>
  );
}