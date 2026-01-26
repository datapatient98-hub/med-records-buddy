import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
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

export default function Records() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("admissions");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const currentTable = useMemo(() => {
    switch (activeTab) {
      case "admissions":
        return "admissions";
      case "emergencies":
        return "emergencies";
      case "endoscopies":
        return "endoscopies";
      case "procedures":
        return "procedures";
      case "loans":
        return "file_loans";
      default:
        return "admissions";
    }
  }, [activeTab]);

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (checked) s.add(id);
      else s.delete(id);
      return Array.from(s);
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (selectedIds.length === 0) return;
      const { error } = await supabase.from(currentTable as any).delete().in("id", selectedIds);
      if (error) throw error;
    },
    onSuccess: async () => {
      setSelectedIds([]);
      await queryClient.invalidateQueries({ queryKey: [activeTab] });
      await queryClient.invalidateQueries({ queryKey: [activeTab, searchTerm] });
      // In case other screens depend on these
      await queryClient.invalidateQueries({ queryKey: ["unified-database"] });
    },
  });

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

  const currentRows: any[] = useMemo(() => {
    switch (activeTab) {
      case "admissions":
        return (admissions as any[]) ?? [];
      case "emergencies":
        return (emergencies as any[]) ?? [];
      case "endoscopies":
        return (endoscopies as any[]) ?? [];
      case "procedures":
        return (procedures as any[]) ?? [];
      case "loans":
        return (loans as any[]) ?? [];
      default:
        return [];
    }
  }, [activeTab, admissions, emergencies, endoscopies, procedures, loans]);

  const allVisibleIds = useMemo(
    () => currentRows.map((r) => r?.id).filter(Boolean) as string[],
    [currentRows]
  );
  const allSelected = allVisibleIds.length > 0 && selectedIds.length === allVisibleIds.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < allVisibleIds.length;

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? allVisibleIds : []);
  };

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
            setActiveTab(v);
            setSelectedIds([]);
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="admissions">الحجوزات ({admissions?.length || 0})</TabsTrigger>
            <TabsTrigger value="emergencies">الطوارئ ({emergencies?.length || 0})</TabsTrigger>
            <TabsTrigger value="endoscopies">المناظير ({endoscopies?.length || 0})</TabsTrigger>
            <TabsTrigger value="procedures">البذل ({procedures?.length || 0})</TabsTrigger>
            <TabsTrigger value="loans">الاستعارات ({loans?.length || 0})</TabsTrigger>
          </TabsList>

          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-muted-foreground">
              المحدد: <span className="font-semibold text-foreground">{selectedIds.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => toggleAll(true)}
                disabled={allVisibleIds.length === 0}
              >
                تحديد الكل
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => toggleAll(false)}
                disabled={selectedIds.length === 0}
              >
                إلغاء التحديد
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={selectedIds.length === 0 || deleteMutation.isPending}
                  >
                    <Trash2 className="ml-2 h-4 w-4" />
                    حذف المحدد
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                    <AlertDialogDescription>
                      سيتم حذف <b>{selectedIds.length}</b> سجل من تبويب <b>{activeTab}</b>.
                      لا يمكن التراجع عن هذا الإجراء.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteMutation.isPending}>إلغاء</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={deleteMutation.isPending}
                      onClick={(e) => {
                        e.preventDefault();
                        deleteMutation.mutate();
                      }}
                    >
                      {deleteMutation.isPending ? "جارٍ الحذف..." : "حذف"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <TabsContent value="admissions" className="mt-6">
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[44px]">
                        <Checkbox
                          checked={allSelected ? true : someSelected ? "indeterminate" : false}
                          onCheckedChange={(v) => toggleAll(Boolean(v))}
                          aria-label="تحديد الكل"
                        />
                      </TableHead>
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
                        <TableCell colSpan={12} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : admissions && admissions.length > 0 ? (
                      admissions.map((admission: any) => (
                        <TableRow key={admission.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(admission.id)}
                              onCheckedChange={(v) => toggleOne(admission.id, Boolean(v))}
                              aria-label="تحديد السجل"
                            />
                          </TableCell>
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
                        <TableCell colSpan={12} className="text-center text-muted-foreground">لا توجد بيانات</TableCell>
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
                      <TableHead className="w-[44px]">
                        <Checkbox
                          checked={allSelected ? true : someSelected ? "indeterminate" : false}
                          onCheckedChange={(v) => toggleAll(Boolean(v))}
                          aria-label="تحديد الكل"
                        />
                      </TableHead>
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
                        <TableCell colSpan={10} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : emergencies && emergencies.length > 0 ? (
                      emergencies.map((emergency: any) => (
                        <TableRow key={emergency.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(emergency.id)}
                              onCheckedChange={(v) => toggleOne(emergency.id, Boolean(v))}
                              aria-label="تحديد السجل"
                            />
                          </TableCell>
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
                        <TableCell colSpan={10} className="text-center text-muted-foreground">لا توجد بيانات</TableCell>
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
                      <TableHead className="w-[44px]">
                        <Checkbox
                          checked={allSelected ? true : someSelected ? "indeterminate" : false}
                          onCheckedChange={(v) => toggleAll(Boolean(v))}
                          aria-label="تحديد الكل"
                        />
                      </TableHead>
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
                        <TableCell colSpan={10} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : endoscopies && endoscopies.length > 0 ? (
                      endoscopies.map((endoscopy: any) => (
                        <TableRow key={endoscopy.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(endoscopy.id)}
                              onCheckedChange={(v) => toggleOne(endoscopy.id, Boolean(v))}
                              aria-label="تحديد السجل"
                            />
                          </TableCell>
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
                        <TableCell colSpan={10} className="text-center text-muted-foreground">لا توجد بيانات</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="procedures" className="mt-6">
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[44px]">
                        <Checkbox
                          checked={allSelected ? true : someSelected ? "indeterminate" : false}
                          onCheckedChange={(v) => toggleAll(Boolean(v))}
                          aria-label="تحديد الكل"
                        />
                      </TableHead>
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
                        <TableCell colSpan={10} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : procedures && procedures.length > 0 ? (
                      procedures.map((procedure: any) => (
                        <TableRow key={procedure.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(procedure.id)}
                              onCheckedChange={(v) => toggleOne(procedure.id, Boolean(v))}
                              aria-label="تحديد السجل"
                            />
                          </TableCell>
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
                        <TableCell colSpan={10} className="text-center text-muted-foreground">لا توجد بيانات</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="loans" className="mt-6">
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[44px]">
                        <Checkbox
                          checked={allSelected ? true : someSelected ? "indeterminate" : false}
                          onCheckedChange={(v) => toggleAll(Boolean(v))}
                          aria-label="تحديد الكل"
                        />
                      </TableHead>
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
                        <TableCell colSpan={9} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : loans && loans.length > 0 ? (
                      loans.map((loan: any) => (
                        <TableRow key={loan.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(loan.id)}
                              onCheckedChange={(v) => toggleOne(loan.id, Boolean(v))}
                              aria-label="تحديد السجل"
                            />
                          </TableCell>
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
                        <TableCell colSpan={9} className="text-center text-muted-foreground">لا توجد بيانات</TableCell>
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