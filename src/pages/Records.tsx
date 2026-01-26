import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

type ProcedureType = "بذل" | "استقبال" | "كلي" | "مناظير";

export default function Records() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState(
    "admissions_internal" as
      | "admissions_internal"
      | "emergencies"
      | "endoscopies"
      | "reception"
      | "dialysis"
      | "paracentesis_men"
      | "paracentesis_women"
      | "loans_men"
      | "loans_women",
  );

  // Fetch admissions
  const { data: admissions, isLoading: admissionsLoading } = useQuery({
    queryKey: ["admissions", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("admissions")
        .select(`
          *,
          department:departments(name),
          governorate:governorates(name),
          district:districts(name),
          diagnosis:diagnoses(name),
          doctor:doctors(name),
          station:stations(name),
          occupation:occupations(name)
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`patient_name.ilike.%${searchTerm}%,unified_number.ilike.%${searchTerm}%,internal_number.eq.${searchTerm}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch emergencies
  const { data: emergencies, isLoading: emergenciesLoading } = useQuery({
    queryKey: ["emergencies", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("emergencies")
        .select(`
          *,
          department:departments(name),
          governorate:governorates(name),
          district:districts(name),
          diagnosis:diagnoses(name),
          doctor:doctors(name)
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`patient_name.ilike.%${searchTerm}%,unified_number.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch endoscopies
  const { data: endoscopies, isLoading: endoscopiesLoading } = useQuery({
    queryKey: ["endoscopies", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("endoscopies")
        .select(`
          *,
          department:departments(name),
          governorate:governorates(name),
          district:districts(name),
          diagnosis:diagnoses(name),
          doctor:doctors(name)
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`patient_name.ilike.%${searchTerm}%,unified_number.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch procedures
  const { data: procedures, isLoading: proceduresLoading } = useQuery({
    queryKey: ["procedures", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("procedures")
        .select(`
          *,
          department:departments(name),
          governorate:governorates(name),
          district:districts(name),
          diagnosis:diagnoses(name),
          doctor:doctors(name)
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`patient_name.ilike.%${searchTerm}%,unified_number.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch loans
  const { data: loans, isLoading: loansLoading } = useQuery({
    queryKey: ["loans", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("file_loans")
        .select(`
          *,
          admission:admissions(patient_name)
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`unified_number.ilike.%${searchTerm}%,borrowed_by.ilike.%${searchTerm}%,borrowed_to_department.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const admissionsInternal = useMemo(
    () => ((admissions as any[]) ?? []).filter((a) => (a?.admission_source ?? "داخلي") === "داخلي"),
    [admissions],
  );

  const proceduresOfType = useMemo(() => {
    const list = (procedures as any[]) ?? [];
    return {
      reception: list.filter((p) => (p?.procedure_type as ProcedureType | null) === "استقبال"),
      dialysis: list.filter((p) => (p?.procedure_type as ProcedureType | null) === "كلي"),
      paracentesis_men: list.filter(
        (p) =>
          (p?.procedure_type as ProcedureType | null) === "بذل" &&
          (p?.department?.name ?? "") === "رجال بذل بطن",
      ),
      paracentesis_women: list.filter(
        (p) =>
          (p?.procedure_type as ProcedureType | null) === "بذل" &&
          (p?.department?.name ?? "") === "بذل حريم بطن",
      ),
    };
  }, [procedures]);

  const loansByDepartment = useMemo(() => {
    const list = (loans as any[]) ?? [];
    return {
      loans_men: list.filter((l) => (l?.borrowed_to_department ?? "") === "رجال بذل بطن"),
      loans_women: list.filter((l) => (l?.borrowed_to_department ?? "") === "بذل حريم بطن"),
    };
  }, [loans]);

  const tabCounts = useMemo(() => {
    return {
      admissions_internal: admissionsInternal.length,
      emergencies: (emergencies as any[])?.length ?? 0,
      endoscopies: (endoscopies as any[])?.length ?? 0,
      reception: proceduresOfType.reception.length,
      dialysis: proceduresOfType.dialysis.length,
      paracentesis_men: proceduresOfType.paracentesis_men.length,
      paracentesis_women: proceduresOfType.paracentesis_women.length,
      loans_men: loansByDepartment.loans_men.length,
      loans_women: loansByDepartment.loans_women.length,
    };
  }, [admissionsInternal, emergencies, endoscopies, loansByDepartment, proceduresOfType]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">سجل المرضى</h1>
          <Button asChild variant="outline">
            <Link to="/unified-database">قاعدة البيانات الموحدة</Link>
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الرقم الموحد أو الرقم الداخلي..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as any);
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9">
            <TabsTrigger value="admissions_internal">الحجز الداخلي ({tabCounts.admissions_internal})</TabsTrigger>
            <TabsTrigger value="emergencies">الطوارئ ({tabCounts.emergencies})</TabsTrigger>
            <TabsTrigger value="endoscopies">المناظير ({tabCounts.endoscopies})</TabsTrigger>
            <TabsTrigger value="reception">الاستقبال ({tabCounts.reception})</TabsTrigger>
            <TabsTrigger value="dialysis">الغسيل الكلوي ({tabCounts.dialysis})</TabsTrigger>
            <TabsTrigger value="paracentesis_men">البذل - رجال ({tabCounts.paracentesis_men})</TabsTrigger>
            <TabsTrigger value="paracentesis_women">البذل - حريم ({tabCounts.paracentesis_women})</TabsTrigger>
            <TabsTrigger value="loans_men">الاستعارات - رجال ({tabCounts.loans_men})</TabsTrigger>
            <TabsTrigger value="loans_women">الاستعارات - حريم ({tabCounts.loans_women})</TabsTrigger>
          </TabsList>

          <TabsContent value="admissions_internal" className="mt-6">
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الرقم الموحد</TableHead>
                      <TableHead>الرقم الداخلي</TableHead>
                      <TableHead>اسم المريض</TableHead>
                      <TableHead>الرقم القومي</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>السن</TableHead>
                      <TableHead>القسم</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التشخيص</TableHead>
                      <TableHead>الطبيب</TableHead>
                      <TableHead>تاريخ الحجز</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admissionsLoading ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : admissionsInternal.length > 0 ? (
                      admissionsInternal.map((admission: any) => (
                        <TableRow key={admission.id}>
                          <TableCell>{admission.unified_number}</TableCell>
                          <TableCell>{admission.internal_number}</TableCell>
                          <TableCell>{admission.patient_name}</TableCell>
                          <TableCell>{admission.national_id}</TableCell>
                          <TableCell>{admission.gender}</TableCell>
                          <TableCell>{admission.age}</TableCell>
                          <TableCell>{admission.department?.name}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              admission.admission_status === 'محجوز' ? 'bg-status-active text-status-active' :
                              admission.admission_status === 'خروج' ? 'bg-status-discharged text-status-discharged' :
                              admission.admission_status === 'متوفى' ? 'bg-status-deceased text-status-deceased' :
                              'bg-status-pending text-status-pending'
                            }`}>
                              {admission.admission_status}
                            </span>
                          </TableCell>
                          <TableCell>{admission.diagnosis?.name || '-'}</TableCell>
                          <TableCell>{admission.doctor?.name || '-'}</TableCell>
                          <TableCell>{format(new Date(admission.admission_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-muted-foreground">لا توجد بيانات</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="emergencies" className="mt-6">
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الرقم الموحد</TableHead>
                      <TableHead>اسم المريض</TableHead>
                      <TableHead>الرقم القومي</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>السن</TableHead>
                      <TableHead>القسم</TableHead>
                      <TableHead>التشخيص</TableHead>
                      <TableHead>الطبيب</TableHead>
                      <TableHead>تاريخ الزيارة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emergenciesLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : emergencies && emergencies.length > 0 ? (
                      emergencies.map((emergency: any) => (
                        <TableRow key={emergency.id}>
                          <TableCell>{emergency.unified_number}</TableCell>
                          <TableCell>{emergency.patient_name}</TableCell>
                          <TableCell>{emergency.national_id}</TableCell>
                          <TableCell>{emergency.gender}</TableCell>
                          <TableCell>{emergency.age}</TableCell>
                          <TableCell>{emergency.department?.name}</TableCell>
                          <TableCell>{emergency.diagnosis?.name || '-'}</TableCell>
                          <TableCell>{emergency.doctor?.name || '-'}</TableCell>
                          <TableCell>{format(new Date(emergency.visit_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">لا توجد بيانات</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="endoscopies" className="mt-6">
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الرقم الموحد</TableHead>
                      <TableHead>اسم المريض</TableHead>
                      <TableHead>الرقم القومي</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>السن</TableHead>
                      <TableHead>القسم</TableHead>
                      <TableHead>التشخيص</TableHead>
                      <TableHead>الطبيب</TableHead>
                      <TableHead>تاريخ الإجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {endoscopiesLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : endoscopies && endoscopies.length > 0 ? (
                      endoscopies.map((endoscopy: any) => (
                        <TableRow key={endoscopy.id}>
                          <TableCell>{endoscopy.unified_number}</TableCell>
                          <TableCell>{endoscopy.patient_name}</TableCell>
                          <TableCell>{endoscopy.national_id}</TableCell>
                          <TableCell>{endoscopy.gender}</TableCell>
                          <TableCell>{endoscopy.age}</TableCell>
                          <TableCell>{endoscopy.department?.name}</TableCell>
                          <TableCell>{endoscopy.diagnosis?.name || '-'}</TableCell>
                          <TableCell>{endoscopy.doctor?.name || '-'}</TableCell>
                          <TableCell>{format(new Date(endoscopy.procedure_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">لا توجد بيانات</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reception" className="mt-6">
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الرقم الموحد</TableHead>
                      <TableHead>اسم المريض</TableHead>
                      <TableHead>الرقم القومي</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>السن</TableHead>
                      <TableHead>القسم</TableHead>
                      <TableHead>التشخيص</TableHead>
                      <TableHead>الطبيب</TableHead>
                      <TableHead>تاريخ الإجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proceduresLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : proceduresOfType.reception.length > 0 ? (
                      proceduresOfType.reception.map((procedure: any) => (
                        <TableRow key={procedure.id}>
                          <TableCell>{procedure.unified_number}</TableCell>
                          <TableCell>{procedure.patient_name}</TableCell>
                          <TableCell>{procedure.national_id}</TableCell>
                          <TableCell>{procedure.gender}</TableCell>
                          <TableCell>{procedure.age}</TableCell>
                          <TableCell>{procedure.department?.name}</TableCell>
                          <TableCell>{procedure.diagnosis?.name || '-'}</TableCell>
                          <TableCell>{procedure.doctor?.name || '-'}</TableCell>
                          <TableCell>{format(new Date(procedure.procedure_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">لا توجد بيانات</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dialysis" className="mt-6">
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الرقم الموحد</TableHead>
                      <TableHead>اسم المريض</TableHead>
                      <TableHead>الرقم القومي</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>السن</TableHead>
                      <TableHead>القسم</TableHead>
                      <TableHead>التشخيص</TableHead>
                      <TableHead>الطبيب</TableHead>
                      <TableHead>تاريخ الإجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proceduresLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : proceduresOfType.dialysis.length > 0 ? (
                      proceduresOfType.dialysis.map((procedure: any) => (
                        <TableRow key={procedure.id}>
                          <TableCell>{procedure.unified_number}</TableCell>
                          <TableCell>{procedure.patient_name}</TableCell>
                          <TableCell>{procedure.national_id}</TableCell>
                          <TableCell>{procedure.gender}</TableCell>
                          <TableCell>{procedure.age}</TableCell>
                          <TableCell>{procedure.department?.name}</TableCell>
                          <TableCell>{procedure.diagnosis?.name || "-"}</TableCell>
                          <TableCell>{procedure.doctor?.name || "-"}</TableCell>
                          <TableCell>{format(new Date(procedure.procedure_date), "dd/MM/yyyy HH:mm")}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">لا توجد بيانات</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="paracentesis_men" className="mt-6">
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الرقم الموحد</TableHead>
                      <TableHead>اسم المريض</TableHead>
                      <TableHead>الرقم القومي</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>السن</TableHead>
                      <TableHead>القسم</TableHead>
                      <TableHead>التشخيص</TableHead>
                      <TableHead>الطبيب</TableHead>
                      <TableHead>تاريخ الإجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proceduresLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : proceduresOfType.paracentesis_men.length > 0 ? (
                      proceduresOfType.paracentesis_men.map((procedure: any) => (
                        <TableRow key={procedure.id}>
                          <TableCell>{procedure.unified_number}</TableCell>
                          <TableCell>{procedure.patient_name}</TableCell>
                          <TableCell>{procedure.national_id}</TableCell>
                          <TableCell>{procedure.gender}</TableCell>
                          <TableCell>{procedure.age}</TableCell>
                          <TableCell>{procedure.department?.name}</TableCell>
                          <TableCell>{procedure.diagnosis?.name || "-"}</TableCell>
                          <TableCell>{procedure.doctor?.name || "-"}</TableCell>
                          <TableCell>{format(new Date(procedure.procedure_date), "dd/MM/yyyy HH:mm")}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">لا توجد بيانات</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="paracentesis_women" className="mt-6">
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الرقم الموحد</TableHead>
                      <TableHead>اسم المريض</TableHead>
                      <TableHead>الرقم القومي</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>السن</TableHead>
                      <TableHead>القسم</TableHead>
                      <TableHead>التشخيص</TableHead>
                      <TableHead>الطبيب</TableHead>
                      <TableHead>تاريخ الإجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proceduresLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : proceduresOfType.paracentesis_women.length > 0 ? (
                      proceduresOfType.paracentesis_women.map((procedure: any) => (
                        <TableRow key={procedure.id}>
                          <TableCell>{procedure.unified_number}</TableCell>
                          <TableCell>{procedure.patient_name}</TableCell>
                          <TableCell>{procedure.national_id}</TableCell>
                          <TableCell>{procedure.gender}</TableCell>
                          <TableCell>{procedure.age}</TableCell>
                          <TableCell>{procedure.department?.name}</TableCell>
                          <TableCell>{procedure.diagnosis?.name || "-"}</TableCell>
                          <TableCell>{procedure.doctor?.name || "-"}</TableCell>
                          <TableCell>{format(new Date(procedure.procedure_date), "dd/MM/yyyy HH:mm")}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">لا توجد بيانات</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="loans_men" className="mt-6">
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الرقم الموحد</TableHead>
                      <TableHead>الرقم الداخلي</TableHead>
                      <TableHead>اسم المريض</TableHead>
                      <TableHead>المستعار</TableHead>
                      <TableHead>القسم المستعار إليه</TableHead>
                      <TableHead>تاريخ الاستعارة</TableHead>
                      <TableHead>تاريخ الإرجاع</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loansLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : loansByDepartment.loans_men.length > 0 ? (
                      loansByDepartment.loans_men.map((loan: any) => (
                        <TableRow key={loan.id}>
                          <TableCell>{loan.unified_number}</TableCell>
                          <TableCell>{loan.internal_number}</TableCell>
                          <TableCell>{loan.admission?.patient_name}</TableCell>
                          <TableCell>{loan.borrowed_by}</TableCell>
                          <TableCell>{loan.borrowed_to_department}</TableCell>
                          <TableCell>{format(new Date(loan.loan_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                          <TableCell>{loan.return_date ? format(new Date(loan.return_date), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              loan.is_returned ? 'bg-status-discharged text-status-discharged' : 'bg-status-pending text-status-pending'
                            }`}>
                              {loan.is_returned ? 'تم الإرجاع' : 'مستعار'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">لا توجد بيانات</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="loans_women" className="mt-6">
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الرقم الموحد</TableHead>
                      <TableHead>الرقم الداخلي</TableHead>
                      <TableHead>اسم المريض</TableHead>
                      <TableHead>المستعار</TableHead>
                      <TableHead>القسم المستعار إليه</TableHead>
                      <TableHead>تاريخ الاستعارة</TableHead>
                      <TableHead>تاريخ الإرجاع</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loansLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : loansByDepartment.loans_women.length > 0 ? (
                      loansByDepartment.loans_women.map((loan: any) => (
                        <TableRow key={loan.id}>
                          <TableCell>{loan.unified_number}</TableCell>
                          <TableCell>{loan.internal_number}</TableCell>
                          <TableCell>{loan.admission?.patient_name}</TableCell>
                          <TableCell>{loan.borrowed_by}</TableCell>
                          <TableCell>{loan.borrowed_to_department}</TableCell>
                          <TableCell>{format(new Date(loan.loan_date), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell>
                            {loan.return_date ? format(new Date(loan.return_date), "dd/MM/yyyy HH:mm") : "-"}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                loan.is_returned
                                  ? "bg-status-discharged text-status-discharged"
                                  : "bg-status-pending text-status-pending"
                              }`}
                            >
                              {loan.is_returned ? "تم الإرجاع" : "مستعار"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">لا توجد بيانات</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}