import { useState } from "react";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

export default function Reports() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [recordType, setRecordType] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [diagnosisFilter, setDiagnosisFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");

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

  // Fetch filtered data
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
        if (departmentFilter) query = query.eq("department_id", departmentFilter);
        if (diagnosisFilter) query = query.eq("diagnosis_id", diagnosisFilter);
        if (doctorFilter) query = query.eq("doctor_id", doctorFilter);

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
        if (departmentFilter) query = query.eq("discharge_department_id", departmentFilter);
        if (diagnosisFilter) query = query.eq("discharge_diagnosis_id", diagnosisFilter);
        if (doctorFilter) query = query.eq("discharge_doctor_id", doctorFilter);

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
        if (departmentFilter) query = query.eq("department_id", departmentFilter);
        if (diagnosisFilter) query = query.eq("diagnosis_id", diagnosisFilter);
        if (doctorFilter) query = query.eq("doctor_id", doctorFilter);

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
        if (departmentFilter) query = query.eq("department_id", departmentFilter);
        if (diagnosisFilter) query = query.eq("diagnosis_id", diagnosisFilter);
        if (doctorFilter) query = query.eq("doctor_id", doctorFilter);

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
        if (departmentFilter) query = query.eq("department_id", departmentFilter);
        if (diagnosisFilter) query = query.eq("diagnosis_id", diagnosisFilter);
        if (doctorFilter) query = query.eq("doctor_id", doctorFilter);

        const { data, error } = await query;
        if (error) throw error;
        results.procedures = data || [];
      }

      return results;
    },
    enabled: false,
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">التقارير الطبية</h1>
        </div>

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
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">الكل</SelectItem>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">التشخيص</label>
            <Select value={diagnosisFilter} onValueChange={setDiagnosisFilter}>
              <SelectTrigger>
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">الكل</SelectItem>
                {diagnoses?.map((diag) => (
                  <SelectItem key={diag.id} value={diag.id}>
                    {diag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">الطبيب</label>
            <Select value={doctorFilter} onValueChange={setDoctorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">الكل</SelectItem>
                {doctors?.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => refetch()} disabled={isLoading}>
            عرض التقرير
          </Button>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={!reportData || isLoading}
          >
            <FileSpreadsheet className="ml-2 h-4 w-4" />
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
      </div>
    </Layout>
  );
}