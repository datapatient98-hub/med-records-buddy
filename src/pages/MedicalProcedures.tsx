import { useMemo, useState } from "react";
 import Layout from "@/components/Layout";
 import { useForm } from "react-hook-form";
 import { zodResolver } from "@hookform/resolvers/zod";
 import * as z from "zod";
 import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
 import { Input } from "@/components/ui/input";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { useToast } from "@/hooks/use-toast";
 import ColoredStatTab from "@/components/ColoredStatTab";
 import TimeFilter, { type TimeRange, getTimeRangeDates } from "@/components/TimeFilter";
 import { Save, Search, Syringe, UserCheck, Activity, Edit } from "lucide-react";
 import SearchableSelect from "@/components/SearchableSelect";
 import LookupCreateDialog, { type LookupCreateType } from "@/components/LookupCreateDialog";
 import LookupManageDialog from "@/components/LookupManageDialog";
 import { Database } from "@/integrations/supabase/types";
 import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
 
 type ProcedureType = "procedure" | "reception" | "kidney";
 
 const procedureSchema = z.object({
   procedure_date: z.string().min(1, "تاريخ الإجراء مطلوب"),
   diagnosis_id: z.string().optional(),
   doctor_id: z.string().optional(),
  discharge_department_id: z.string().optional(),
  procedure_status: z.string().optional(),
  hospital_id: z.string().optional(),
 });
 
 type ProcedureFormValues = z.infer<typeof procedureSchema>;
 type AdmissionData = Database["public"]["Tables"]["admissions"]["Row"];
type ProcedureData = Database["public"]["Tables"]["procedures"]["Row"];
 
 export default function MedicalProcedures() {
   const { toast } = useToast();
   const queryClient = useQueryClient();
   const [activeTab, setActiveTab] = useState<ProcedureType>("procedure");
   const [searchNumber, setSearchNumber] = useState("");
   const [timeRange, setTimeRange] = useState<TimeRange>("month");
   const [selectedAdmission, setSelectedAdmission] = useState<AdmissionData | null>(null);
   const [showEditAdmissionDialog, setShowEditAdmissionDialog] = useState(false);
   
   // Lookup dialog states
   const [showDiagnosisDialog, setShowDiagnosisDialog] = useState(false);
   const [showDiagnosisManage, setShowDiagnosisManage] = useState(false);
   const [showDoctorDialog, setShowDoctorDialog] = useState(false);
   const [showDoctorManage, setShowDoctorManage] = useState(false);
   const [showGovernorateDialog, setShowGovernorateDialog] = useState(false);
   const [showGovernorateManage, setShowGovernorateManage] = useState(false);
   const [showDistrictDialog, setShowDistrictDialog] = useState(false);
   const [showDistrictManage, setShowDistrictManage] = useState(false);
   const [showStationDialog, setShowStationDialog] = useState(false);
   const [showStationManage, setShowStationManage] = useState(false);
   const [showOccupationDialog, setShowOccupationDialog] = useState(false);
   const [showOccupationManage, setShowOccupationManage] = useState(false);
   const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
   const [showDepartmentManage, setShowDepartmentManage] = useState(false);
  const [showHospitalDialog, setShowHospitalDialog] = useState(false);
  const [showHospitalManage, setShowHospitalManage] = useState(false);
 
   const form = useForm<ProcedureFormValues>({
     resolver: zodResolver(procedureSchema),
     defaultValues: {
       procedure_date: new Date().toISOString().slice(0, 16),
      discharge_department_id: "",
      procedure_status: "",
      hospital_id: "",
     },
   });
 
   const editAdmissionForm = useForm({
     defaultValues: {
       patient_name: "",
       national_id: "",
       phone: "",
       gender: "",
       marital_status: "",
       age: 0,
       governorate_id: "",
       district_id: "",
       station_id: "",
       occupation_id: "",
       address_details: "",
       department_id: "",
       diagnosis_id: "",
       doctor_id: "",
       admission_date: "",
     },
   });
 
   // Fetch lookup data
  const { data: hospitals } = useQuery({
    queryKey: ["hospitals"],
    queryFn: async () => {
      const { data } = await supabase.from("hospitals").select("*").order("name");
      return data || [];
    },
  });

   const { data: departments } = useQuery({
     queryKey: ["departments"],
     queryFn: async () => {
       const { data } = await supabase.from("departments").select("*").order("name");
       return data || [];
     },
   });
 
   const { data: doctors } = useQuery({
     queryKey: ["doctors"],
     queryFn: async () => {
       const { data } = await supabase.from("doctors").select("*").order("name");
       return data || [];
     },
   });
 
   const { data: diagnoses } = useQuery({
     queryKey: ["diagnoses"],
     queryFn: async () => {
       const { data } = await supabase.from("diagnoses").select("*").order("name");
       return data || [];
     },
   });
 
   const { data: occupations } = useQuery({
     queryKey: ["occupations"],
     queryFn: async () => {
       const { data } = await supabase.from("occupations").select("*").order("name");
       return data || [];
     },
   });
 
   const { data: governorates } = useQuery({
     queryKey: ["governorates"],
     queryFn: async () => {
       const { data } = await supabase.from("governorates").select("*").order("name");
       return data || [];
     },
   });
 
   const { data: stations } = useQuery({
     queryKey: ["stations"],
     queryFn: async () => {
       const { data } = await supabase.from("stations").select("*").order("name");
       return data || [];
     },
   });
 
   const { data: districts } = useQuery({
     queryKey: ["districts"],
     queryFn: async () => {
       const { data } = await supabase.from("districts").select("*").order("name");
       return data || [];
     },
   });
 
 // Filter departments for discharge - only specific ones
 const dischargeDepartments = useMemo(() => {
   if (!departments) return [];
   const allowedNames = ["بذل رجال بطن", "غسيل كلوي", "استقبال"];
   return departments.filter(d => allowedNames.includes(d.name));
 }, [departments]);

 // Status options for procedures
 const statusOptions = useMemo(() => [
   { id: "تحسن", name: "تحسن" },
   { id: "هروب", name: "هروب" },
   { id: "تحويل", name: "تحويل" },
   { id: "حسب الطلب", name: "حسب الطلب" },
   { id: "وفاة", name: "وفاة" },
 ], []);

 const procedureStatus = form.watch("procedure_status");

   const { start, end } = getTimeRangeDates(timeRange);
 
   // Get counts for each procedure type
   const { data: procedureCounts } = useQuery({
     queryKey: ["procedures-counts", timeRange],
     queryFn: async () => {
       const types = ["procedure", "reception", "kidney"] as const;
       const typeMap = {
         procedure: "بذل",
         reception: "استقبال",
         kidney: "كلي"
       } as const;
 
       const counts = await Promise.all(types.map(async (type) => {
         const { count, error } = await supabase
           .from("procedures")
           .select("id", { count: "exact", head: true })
           .eq("procedure_type", typeMap[type] as Database["public"]["Enums"]["procedure_type"])
           .gte("procedure_date", start.toISOString())
           .lte("procedure_date", end.toISOString());
         if (error) throw error;
         return { type, count: count ?? 0 };
       }));
 
       return Object.fromEntries(counts.map(c => [c.type, c.count]));
     },
   });

  // Get detailed status counts for each procedure type
  const { data: statusCounts } = useQuery({
    queryKey: ["procedures-status-counts", timeRange],
    queryFn: async () => {
      const types: ProcedureType[] = ["procedure", "reception", "kidney"];
      const typeMap: Record<ProcedureType, string> = {
        procedure: "بذل",
        reception: "استقبال",
        kidney: "كلي"
      };
      
      const allCounts: Record<string, any> = {};
      
      for (const type of types) {
        const statuses = ["تحسن", "تحويل", "وفاة"];
        const counts = await Promise.all(statuses.map(async (status) => {
          const { count, error } = await supabase
            .from("procedures")
            .select("id", { count: "exact", head: true })
            .eq("procedure_type", typeMap[type] as Database["public"]["Enums"]["procedure_type"])
            .eq("procedure_status", status)
            .gte("procedure_date", start.toISOString())
            .lte("procedure_date", end.toISOString());
          if (error) throw error;
          return { status, count: count ?? 0 };
        }));
        
        allCounts[type] = Object.fromEntries(counts.map(c => [c.status, c.count]));
      }
      
      return allCounts;
    },
  });
 
   const handleSearch = async () => {
     if (!searchNumber.trim()) {
       toast({
         title: "خطأ",
         description: "الرجاء إدخال الرقم الموحد",
         variant: "destructive",
        duration: 10000,
       });
       return;
     }
 
     const { data, error } = await supabase
       .from("admissions")
       .select("*")
       .eq("unified_number", searchNumber)
       .maybeSingle();
 
     if (error || !data) {
       toast({
         title: "لم يتم العثور على المريض",
         description: "تأكد من الرقم الموحد",
         variant: "destructive",
        duration: 10000,
       });
       setSelectedAdmission(null);
       return;
     }
 
     setSelectedAdmission(data);
     form.setValue("diagnosis_id", data.diagnosis_id || "");
     form.setValue("doctor_id", data.doctor_id || "");
     form.setValue("procedure_date", new Date().toISOString().slice(0, 16));
    form.setValue("discharge_department_id", "");
    form.setValue("procedure_status", "");
    form.setValue("hospital_id", "");
    
    toast({
      title: "✓ تم تحميل بيانات المريض بنجاح",
      description: `${data.patient_name} - ${data.unified_number}`,
      duration: 5000,
    });
   };
 
   const editAdmissionMutation = useMutation({
     mutationFn: async (values: any) => {
       if (!selectedAdmission) return;
 
       const { error } = await supabase
         .from("admissions")
         .update({
           patient_name: values.patient_name,
           national_id: values.national_id,
           phone: values.phone,
           gender: values.gender as any,
           marital_status: values.marital_status as any,
           age: parseInt(values.age),
           governorate_id: values.governorate_id || null,
           district_id: values.district_id || null,
           station_id: values.station_id || null,
           occupation_id: values.occupation_id || null,
           address_details: values.address_details || null,
           department_id: values.department_id,
           diagnosis_id: values.diagnosis_id || null,
           doctor_id: values.doctor_id || null,
           admission_date: values.admission_date,
         })
         .eq("id", selectedAdmission.id);
 
       if (error) throw error;
       return selectedAdmission.unified_number;
     },
     onSuccess: async (unifiedNumber) => {
       queryClient.invalidateQueries({ queryKey: ["admissions"] });
       toast({
         title: "تم التحديث بنجاح",
         description: "تم تحديث بيانات الدخول",
       });
       
       const { data } = await supabase
         .from("admissions")
         .select("*")
         .eq("unified_number", unifiedNumber)
         .maybeSingle();
 
       if (data) {
         setSelectedAdmission(data);
         form.setValue("diagnosis_id", data.diagnosis_id || "");
         form.setValue("doctor_id", data.doctor_id || "");
       }
 
       setShowEditAdmissionDialog(false);
     },
     onError: (error: any) => {
       toast({
         title: "خطأ في التحديث",
         description: error.message,
         variant: "destructive",
        duration: 10000,
       });
     },
   });
 
   const mutation = useMutation({
     mutationFn: async (values: ProcedureFormValues) => {
       if (!selectedAdmission) throw new Error("لم يتم اختيار مريض");
 
       const typeMap: Record<ProcedureType, string> = {
         procedure: "بذل",
         reception: "استقبال",
         kidney: "كلي"
       };
 
       const departmentMap: Record<ProcedureType, string> = {
         procedure: "بذل",
         reception: "استقبال",
         kidney: "كلي"
       };
       
       const targetDeptName = departmentMap[activeTab];
       const targetDept = departments?.find(d => d.name === targetDeptName);
 
       const insertData: any = {
         admission_id: selectedAdmission.id,
         unified_number: selectedAdmission.unified_number,
         patient_name: selectedAdmission.patient_name,
         national_id: selectedAdmission.national_id,
         gender: selectedAdmission.gender,
         marital_status: selectedAdmission.marital_status,
         phone: selectedAdmission.phone,
         age: selectedAdmission.age,
         department_id: targetDept?.id || selectedAdmission.department_id,
         procedure_date: values.procedure_date,
         procedure_type: typeMap[activeTab],
         occupation_id: selectedAdmission.occupation_id || null,
         governorate_id: selectedAdmission.governorate_id || null,
         district_id: selectedAdmission.district_id || null,
         address_details: selectedAdmission.address_details || null,
         station_id: selectedAdmission.station_id || null,
         diagnosis_id: values.diagnosis_id || null,
         doctor_id: values.doctor_id || null,
        discharge_department_id: values.discharge_department_id || null,
        procedure_status: values.procedure_status || null,
        hospital_id: values.hospital_id || null,
       };
 
       const { data, error } = await supabase
         .from("procedures")
         .insert([insertData])
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: (data) => {
       queryClient.invalidateQueries({ queryKey: ["procedures"] });
       queryClient.invalidateQueries({ queryKey: ["procedures-counts"] });
      queryClient.invalidateQueries({ queryKey: ["procedures-status-counts"] });
       const typeLabel = activeTab === "procedure" ? "بذل" : activeTab === "reception" ? "استقبال" : "كلي";
       toast({
        title: "✓ تم الحفظ بنجاح",
        description: `تم تسجيل ${typeLabel} للمريض: ${data.patient_name}`,
        duration: 10000,
        className: "bg-green-600 text-white border-green-700 shadow-2xl",
       });
      
      // Show internal number in a separate toast
      setTimeout(() => {
        toast({
          title: "📋 الرقم الداخلي",
          description: `${data.internal_number}`,
          duration: 10000,
          className: "bg-blue-600 text-white border-blue-700 shadow-2xl font-bold text-lg",
        });
      }, 500);
      
      // Reset form and clear selection
      setSelectedAdmission(null);
      setSearchNumber("");
      form.reset({
        procedure_date: new Date().toISOString().slice(0, 16),
        discharge_department_id: "",
        procedure_status: "",
        hospital_id: "",
      });
     },
     onError: (error: any) => {
       toast({
         title: "خطأ في الحفظ",
         description: error.message,
         variant: "destructive",
        duration: 10000,
       });
     },
   });
 
   const onSubmit = (data: ProcedureFormValues) => {
     mutation.mutate(data);
   };
 
   const handleTabChange = (newTab: ProcedureType) => {
     setActiveTab(newTab);
   };
 
   const getTabInfo = () => {
     switch (activeTab) {
       case "procedure":
         return { icon: Syringe, title: "تسجيل بذل", color: "text-green" };
       case "reception":
         return { icon: UserCheck, title: "تسجيل استقبال", color: "text-cyan" };
       case "kidney":
         return { icon: Activity, title: "تسجيل كلي", color: "text-orange" };
     }
   };
 
   const tabInfo = getTabInfo();
   const Icon = tabInfo.icon;
 
   return (
     <Layout>
       <div className="space-y-6">
         <div className="flex items-center justify-between">
           <div>
             <h2 className="text-3xl font-bold text-foreground">تسجيل الإجراءات الطبية</h2>
             <p className="text-muted-foreground">البذل - الاستقبال - الغسيل الكلوي</p>
           </div>
           <TimeFilter value={timeRange} onChange={setTimeRange} />
         </div>
 
         {/* Colored Tabs */}
         <div className="sticky top-16 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4">
           <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
             <ColoredStatTab
               title="البذل"
               value={procedureCounts?.procedure ?? 0}
               subtitle={`خلال ${timeRange === "day" ? "اليوم" : timeRange === "week" ? "الأسبوع" : timeRange === "month" ? "الشهر" : "3 أشهر"}`}
               icon={Syringe}
              color="blue"
               onClick={() => handleTabChange("procedure")}
               active={activeTab === "procedure"}
              details={statusCounts?.procedure ? 
                `تحسن ${statusCounts.procedure["تحسن"] || 0} • تحويل ${statusCounts.procedure["تحويل"] || 0} • وفاة ${statusCounts.procedure["وفاة"] || 0}` : 
                undefined
              }
             />
             <ColoredStatTab
               title="الاستقبال"
               value={procedureCounts?.reception ?? 0}
               subtitle={`خلال ${timeRange === "day" ? "اليوم" : timeRange === "week" ? "الأسبوع" : timeRange === "month" ? "الشهر" : "3 أشهر"}`}
               icon={UserCheck}
              color="green"
               onClick={() => handleTabChange("reception")}
               active={activeTab === "reception"}
              details={statusCounts?.reception ? 
                `تحسن ${statusCounts.reception["تحسن"] || 0} • تحويل ${statusCounts.reception["تحويل"] || 0} • وفاة ${statusCounts.reception["وفاة"] || 0}` : 
                undefined
              }
             />
             <ColoredStatTab
               title="الكلي"
               value={procedureCounts?.kidney ?? 0}
               subtitle={`خلال ${timeRange === "day" ? "اليوم" : timeRange === "week" ? "الأسبوع" : timeRange === "month" ? "الشهر" : "3 أشهر"}`}
               icon={Activity}
               color="orange"
               onClick={() => handleTabChange("kidney")}
               active={activeTab === "kidney"}
              details={statusCounts?.kidney ? 
                `تحسن ${statusCounts.kidney["تحسن"] || 0} • تحويل ${statusCounts.kidney["تحويل"] || 0} • وفاة ${statusCounts.kidney["وفاة"] || 0}` : 
                undefined
              }
             />
           </div>
         </div>
 
         {/* Search Section */}
         <Card className="shadow-lg border-border">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Icon className={`h-5 w-5 ${tabInfo.color}`} />
               {tabInfo.title}
             </CardTitle>
             <CardDescription>ابحث بالرقم الموحد لتحميل بيانات المريض</CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="flex gap-2">
               <Input
                 placeholder="الرقم الموحد"
                 value={searchNumber}
                 onChange={(e) => setSearchNumber(e.target.value)}
                 onBlur={handleSearch}
                 onKeyPress={(e) => e.key === "Enter" && handleSearch()}
               />
               <Button onClick={handleSearch}>
                 <Search className="mr-2 h-4 w-4" />
                 بحث
               </Button>
             </div>
           </CardContent>
         </Card>
 
         {/* Patient Data Display Card */}
         {selectedAdmission && (
          <Card className="shadow-2xl border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 animate-fade-in">
             <CardHeader className="pb-3">
              <CardTitle className="text-primary flex items-center gap-2">
                <span className="text-2xl">👤</span>
                بيانات المريض
              </CardTitle>
               <CardDescription>معلومات الدخول للرقم الموحد: {selectedAdmission.unified_number}</CardDescription>
             </CardHeader>
             <CardContent>
              <div className="grid gap-3 md:grid-cols-3 text-sm">
                 <div>
                  <div className="p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">الاسم</span>
                    <span className="text-foreground font-medium">{selectedAdmission.patient_name}</span>
                  </div>
                 </div>
                 <div>
                  <div className="p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">الرقم القومي</span>
                    <span className="text-foreground font-medium">{selectedAdmission.national_id}</span>
                  </div>
                 </div>
                 <div>
                  <div className="p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">الهاتف</span>
                    <span className="text-foreground font-medium">{selectedAdmission.phone}</span>
                  </div>
                 </div>
                 <div>
                  <div className="p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">النوع</span>
                    <span className="text-foreground font-medium">{selectedAdmission.gender}</span>
                  </div>
                 </div>
                 <div>
                  <div className="p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">السن</span>
                    <span className="text-foreground font-medium">{selectedAdmission.age} سنة</span>
                  </div>
                 </div>
                 <div>
                  <div className="p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">الحالة الاجتماعية</span>
                    <span className="text-foreground font-medium">{selectedAdmission.marital_status}</span>
                  </div>
                 </div>
                 <div>
                  <div className="p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">المهنة</span>
                    <span className="text-foreground font-medium">
                      {occupations?.find((o) => o.id === selectedAdmission.occupation_id)?.name || "-"}
                    </span>
                  </div>
                 </div>
                 <div>
                  <div className="p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">المحافظة</span>
                    <span className="text-foreground font-medium">
                      {governorates?.find((g) => g.id === selectedAdmission.governorate_id)?.name || "-"}
                    </span>
                  </div>
                 </div>
                 <div>
                  <div className="p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">المركز</span>
                    <span className="text-foreground font-medium">
                      {districts?.find((d) => d.id === selectedAdmission.district_id)?.name || "-"}
                    </span>
                  </div>
                 </div>
                 <div>
                  <div className="p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">المحطة</span>
                    <span className="text-foreground font-medium">
                      {stations?.find((s) => s.id === selectedAdmission.station_id)?.name || "-"}
                    </span>
                  </div>
                 </div>
                <div className="md:col-span-2">
                  <div className="p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">العنوان التفصيلي</span>
                    <span className="text-foreground font-medium">{selectedAdmission.address_details || "-"}</span>
                  </div>
                 </div>
                 <div>
                  <div className="p-2 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/20">
                    <span className="text-xs font-semibold text-primary block mb-1">القسم</span>
                    <span className="text-foreground font-bold">
                      {departments?.find((d) => d.id === selectedAdmission.department_id)?.name || "-"}
                    </span>
                  </div>
                 </div>
                 <div>
                  <div className="p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">التشخيص</span>
                    <span className="text-foreground font-medium">
                      {diagnoses?.find((d) => d.id === selectedAdmission.diagnosis_id)?.name || "-"}
                    </span>
                  </div>
                 </div>
                 <div>
                  <div className="p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">الطبيب</span>
                    <span className="text-foreground font-medium">
                      {doctors?.find((d) => d.id === selectedAdmission.doctor_id)?.name || "-"}
                    </span>
                  </div>
                 </div>
                 <div>
                  <div className="p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">تاريخ الدخول</span>
                    <span className="text-foreground font-medium">
                      {new Date(selectedAdmission.admission_date).toLocaleString("ar-EG")}
                    </span>
                  </div>
                 </div>
               </div>
               <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                 <Button
                   variant="outline"
                   onClick={() => {
                     editAdmissionForm.reset({
                       patient_name: selectedAdmission.patient_name,
                       national_id: selectedAdmission.national_id,
                       phone: selectedAdmission.phone,
                       gender: selectedAdmission.gender,
                       marital_status: selectedAdmission.marital_status,
                       age: selectedAdmission.age,
                       governorate_id: selectedAdmission.governorate_id || "",
                       district_id: selectedAdmission.district_id || "",
                       station_id: selectedAdmission.station_id || "",
                       occupation_id: selectedAdmission.occupation_id || "",
                       address_details: selectedAdmission.address_details || "",
                       department_id: selectedAdmission.department_id,
                       diagnosis_id: selectedAdmission.diagnosis_id || "",
                       doctor_id: selectedAdmission.doctor_id || "",
                       admission_date: new Date(selectedAdmission.admission_date).toISOString().slice(0, 16),
                     });
                     setShowEditAdmissionDialog(true);
                   }}
                 >
                   <Edit className="mr-2 h-4 w-4" />
                   تعديل بيانات الدخول
                 </Button>
               </div>
             </CardContent>
           </Card>
         )}
 
         {/* Procedure Form */}
         {selectedAdmission && (
           <Card className="shadow-lg border-border">
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Icon className={`h-5 w-5 ${tabInfo.color}`} />
                 {tabInfo.title}
               </CardTitle>
               <CardDescription>أدخل تفاصيل الإجراء</CardDescription>
             </CardHeader>
             <CardContent>
               <Form {...form}>
                 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                   <div className="grid gap-4 md:grid-cols-2">
                     <FormField
                       control={form.control}
                       name="diagnosis_id"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>التشخيص</FormLabel>
                           <FormControl>
                             <SearchableSelect
                               value={field.value}
                               onValueChange={field.onChange}
                               options={diagnoses || []}
                               placeholder="اختر التشخيص"
                               onAddNew={() => setShowDiagnosisDialog(true)}
                               onManage={() => setShowDiagnosisManage(true)}
                             />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
 
                     <FormField
                       control={form.control}
                       name="doctor_id"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>الطبيب</FormLabel>
                           <FormControl>
                             <SearchableSelect
                               value={field.value}
                               onValueChange={field.onChange}
                               options={doctors || []}
                               placeholder="اختر الطبيب"
                               onAddNew={() => setShowDoctorDialog(true)}
                               onManage={() => setShowDoctorManage(true)}
                             />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
 
                     <FormField
                       control={form.control}
                       name="procedure_date"
                       render={({ field }) => (
                          <FormItem>
                           <FormLabel>تاريخ وساعة الإجراء *</FormLabel>
                           <FormControl>
                             <Input type="datetime-local" {...field} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />

                      <FormField
                        control={form.control}
                        name="discharge_department_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>قسم الخروج</FormLabel>
                            <FormControl>
                              <SearchableSelect
                                value={field.value || ""}
                                onValueChange={field.onChange}
                                options={dischargeDepartments || []}
                                placeholder="اختر قسم الخروج"
                                emptyText="لا توجد أقسام"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="procedure_status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>حالة الخروج</FormLabel>
                            <FormControl>
                              <SearchableSelect
                                value={field.value || ""}
                                onValueChange={field.onChange}
                                options={statusOptions}
                                placeholder="اختر الحالة"
                                emptyText="لا توجد حالات"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {procedureStatus === "تحويل" && (
                        <FormField
                          control={form.control}
                          name="hospital_id"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>المستشفى المحول إليها *</FormLabel>
                              <FormControl>
                                <SearchableSelect
                                  value={field.value || ""}
                                  onValueChange={field.onChange}
                                  options={hospitals || []}
                                  placeholder="اختر المستشفى"
                                  emptyText="لا توجد مستشفيات"
                                  onAddNew={() => setShowHospitalDialog(true)}
                                  onManage={() => setShowHospitalManage(true)}
                                  addNewLabel="إضافة مستشفى"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                   </div>
 
                   <div className="flex justify-end gap-2">
                     <Button
                       type="button"
                       variant="outline"
                       onClick={() => {
                         setSelectedAdmission(null);
                         setSearchNumber("");
                          form.reset({
                            procedure_date: new Date().toISOString().slice(0, 16),
                            discharge_department_id: "",
                            procedure_status: "",
                            hospital_id: "",
                          });
                       }}
                     >
                       إلغاء
                     </Button>
                     <Button type="submit" disabled={mutation.isPending}>
                       <Save className="mr-2 h-4 w-4" />
                       {mutation.isPending ? "جاري الحفظ..." : "حفظ الإجراء"}
                     </Button>
                   </div>
                 </form>
               </Form>
             </CardContent>
           </Card>
         )}
 
         {/* Edit Admission Dialog */}
         {showEditAdmissionDialog && selectedAdmission && (
           <Dialog open={showEditAdmissionDialog} onOpenChange={setShowEditAdmissionDialog}>
             <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
               <DialogHeader>
                 <DialogTitle>تعديل بيانات الدخول</DialogTitle>
               </DialogHeader>
               <Form {...editAdmissionForm}>
                 <form
                   onSubmit={editAdmissionForm.handleSubmit((data) => editAdmissionMutation.mutate(data))}
                   className="space-y-4"
                 >
                   <div className="grid gap-4 md:grid-cols-2">
                     <FormField
                       control={editAdmissionForm.control}
                       name="patient_name"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>اسم المريض *</FormLabel>
                           <FormControl>
                             <Input {...field} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
 
                     <FormField
                       control={editAdmissionForm.control}
                       name="national_id"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>الرقم القومي *</FormLabel>
                           <FormControl>
                             <Input {...field} maxLength={14} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
 
                     <FormField
                       control={editAdmissionForm.control}
                       name="phone"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>الهاتف *</FormLabel>
                           <FormControl>
                             <Input {...field} maxLength={11} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
 
                     <FormField
                       control={editAdmissionForm.control}
                       name="gender"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>النوع *</FormLabel>
                           <Select onValueChange={field.onChange} value={field.value}>
                             <FormControl>
                               <SelectTrigger>
                                 <SelectValue />
                               </SelectTrigger>
                             </FormControl>
                             <SelectContent>
                               <SelectItem value="ذكر">ذكر</SelectItem>
                               <SelectItem value="أنثى">أنثى</SelectItem>
                             </SelectContent>
                           </Select>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
 
                     <FormField
                       control={editAdmissionForm.control}
                       name="marital_status"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>الحالة الاجتماعية *</FormLabel>
                           <Select onValueChange={field.onChange} value={field.value}>
                             <FormControl>
                               <SelectTrigger>
                                 <SelectValue />
                               </SelectTrigger>
                             </FormControl>
                             <SelectContent>
                               <SelectItem value="أعزب">أعزب</SelectItem>
                               <SelectItem value="متزوج">متزوج</SelectItem>
                               <SelectItem value="مطلق">مطلق</SelectItem>
                               <SelectItem value="أرمل">أرمل</SelectItem>
                             </SelectContent>
                           </Select>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
 
                     <FormField
                       control={editAdmissionForm.control}
                       name="age"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>السن *</FormLabel>
                           <FormControl>
                             <Input type="number" {...field} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
 
                     <FormField
                       control={editAdmissionForm.control}
                       name="governorate_id"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>المحافظة</FormLabel>
                           <FormControl>
                             <SearchableSelect
                               value={field.value}
                               onValueChange={field.onChange}
                               options={governorates || []}
                               placeholder="اختر المحافظة"
                               onAddNew={() => setShowGovernorateDialog(true)}
                               onManage={() => setShowGovernorateManage(true)}
                             />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
 
                     <FormField
                       control={editAdmissionForm.control}
                       name="district_id"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>المركز</FormLabel>
                           <FormControl>
                             <SearchableSelect
                               value={field.value}
                               onValueChange={field.onChange}
                               options={districts || []}
                               placeholder="اختر المركز"
                               onAddNew={() => setShowDistrictDialog(true)}
                               onManage={() => setShowDistrictManage(true)}
                             />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
 
                     <FormField
                       control={editAdmissionForm.control}
                       name="station_id"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>المحطة</FormLabel>
                           <FormControl>
                             <SearchableSelect
                               value={field.value}
                               onValueChange={field.onChange}
                               options={stations || []}
                               placeholder="اختر المحطة"
                               onAddNew={() => setShowStationDialog(true)}
                               onManage={() => setShowStationManage(true)}
                             />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
 
                     <FormField
                       control={editAdmissionForm.control}
                       name="occupation_id"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>المهنة</FormLabel>
                           <FormControl>
                             <SearchableSelect
                               value={field.value}
                               onValueChange={field.onChange}
                               options={occupations || []}
                               placeholder="اختر المهنة"
                               onAddNew={() => setShowOccupationDialog(true)}
                               onManage={() => setShowOccupationManage(true)}
                             />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
 
                     <FormField
                       control={editAdmissionForm.control}
                       name="address_details"
                       render={({ field }) => (
                         <FormItem className="md:col-span-2">
                           <FormLabel>العنوان التفصيلي</FormLabel>
                           <FormControl>
                             <Input {...field} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
 
                     <FormField
                       control={editAdmissionForm.control}
                       name="department_id"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>القسم *</FormLabel>
                           <FormControl>
                             <SearchableSelect
                               value={field.value}
                               onValueChange={field.onChange}
                               options={departments || []}
                               placeholder="اختر القسم"
                               onAddNew={() => setShowDepartmentDialog(true)}
                               onManage={() => setShowDepartmentManage(true)}
                             />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
 
                     <FormField
                       control={editAdmissionForm.control}
                       name="diagnosis_id"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>التشخيص</FormLabel>
                           <FormControl>
                             <SearchableSelect
                               value={field.value}
                               onValueChange={field.onChange}
                               options={diagnoses || []}
                               placeholder="اختر التشخيص"
                               onAddNew={() => setShowDiagnosisDialog(true)}
                               onManage={() => setShowDiagnosisManage(true)}
                             />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
 
                     <FormField
                       control={editAdmissionForm.control}
                       name="doctor_id"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>الطبيب</FormLabel>
                           <FormControl>
                             <SearchableSelect
                               value={field.value}
                               onValueChange={field.onChange}
                               options={doctors || []}
                               placeholder="اختر الطبيب"
                               onAddNew={() => setShowDoctorDialog(true)}
                               onManage={() => setShowDoctorManage(true)}
                             />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
 
                     <FormField
                       control={editAdmissionForm.control}
                       name="admission_date"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>تاريخ الدخول *</FormLabel>
                           <FormControl>
                             <Input type="datetime-local" {...field} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                   </div>
 
                   <div className="flex justify-end gap-2 pt-4">
                     <Button
                       type="button"
                       variant="outline"
                       onClick={() => setShowEditAdmissionDialog(false)}
                     >
                       إلغاء
                     </Button>
                     <Button type="submit" disabled={editAdmissionMutation.isPending}>
                       {editAdmissionMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
                     </Button>
                   </div>
                 </form>
               </Form>
             </DialogContent>
           </Dialog>
         )}
 
         {/* Lookup Dialogs */}
         {showDiagnosisDialog && (
           <LookupCreateDialog
             type="diagnosis"
             open={showDiagnosisDialog}
             onOpenChange={setShowDiagnosisDialog}
             onCreated={(item) => {
               form.setValue("diagnosis_id", item.id);
               setShowDiagnosisDialog(false);
             }}
           />
         )}
 
         {showDiagnosisManage && (
           <LookupManageDialog
             type="diagnosis"
             open={showDiagnosisManage}
             onOpenChange={setShowDiagnosisManage}
             items={diagnoses || []}
           />
         )}
 
         {showDoctorDialog && (
           <LookupCreateDialog
             type="doctor"
             open={showDoctorDialog}
             onOpenChange={setShowDoctorDialog}
             onCreated={(item) => {
               form.setValue("doctor_id", item.id);
               setShowDoctorDialog(false);
             }}
           />
         )}
 
         {showDoctorManage && (
           <LookupManageDialog
             type="doctor"
             open={showDoctorManage}
             onOpenChange={setShowDoctorManage}
             items={doctors || []}
           />
         )}
 
         {showGovernorateDialog && (
           <LookupCreateDialog
             type="governorate"
             open={showGovernorateDialog}
             onOpenChange={setShowGovernorateDialog}
             onCreated={(item) => {
               editAdmissionForm.setValue("governorate_id", item.id);
               setShowGovernorateDialog(false);
             }}
           />
         )}
 
         {showGovernorateManage && (
           <LookupManageDialog
             type="governorate"
             open={showGovernorateManage}
             onOpenChange={setShowGovernorateManage}
             items={governorates || []}
           />
         )}
 
         {showDistrictDialog && (
           <LookupCreateDialog
             type="district"
             open={showDistrictDialog}
             onOpenChange={setShowDistrictDialog}
             onCreated={(item) => {
               editAdmissionForm.setValue("district_id", item.id);
               setShowDistrictDialog(false);
             }}
           />
         )}
 
         {showDistrictManage && (
           <LookupManageDialog
             type="district"
             open={showDistrictManage}
             onOpenChange={setShowDistrictManage}
             items={districts || []}
           />
         )}
 
         {showStationDialog && (
           <LookupCreateDialog
             type="station"
             open={showStationDialog}
             onOpenChange={setShowStationDialog}
             onCreated={(item) => {
               editAdmissionForm.setValue("station_id", item.id);
               setShowStationDialog(false);
             }}
           />
         )}
 
         {showStationManage && (
           <LookupManageDialog
             type="station"
             open={showStationManage}
             onOpenChange={setShowStationManage}
             items={stations || []}
           />
         )}
 
         {showOccupationDialog && (
           <LookupCreateDialog
             type="occupation"
             open={showOccupationDialog}
             onOpenChange={setShowOccupationDialog}
             onCreated={(item) => {
               editAdmissionForm.setValue("occupation_id", item.id);
               setShowOccupationDialog(false);
             }}
           />
         )}
 
         {showOccupationManage && (
           <LookupManageDialog
             type="occupation"
             open={showOccupationManage}
             onOpenChange={setShowOccupationManage}
             items={occupations || []}
           />
         )}
 
         {showDepartmentDialog && (
           <LookupCreateDialog
             type="department"
             open={showDepartmentDialog}
             onOpenChange={setShowDepartmentDialog}
             onCreated={(item) => {
               editAdmissionForm.setValue("department_id", item.id);
               setShowDepartmentDialog(false);
             }}
           />
         )}
 
         {showDepartmentManage && (
           <LookupManageDialog
             type="department"
             open={showDepartmentManage}
             onOpenChange={setShowDepartmentManage}
             items={departments || []}
           />
         )}

          {showHospitalDialog && (
            <LookupCreateDialog
              type="hospital"
              open={showHospitalDialog}
              onOpenChange={setShowHospitalDialog}
              onCreated={(item) => {
                form.setValue("hospital_id", item.id);
                setShowHospitalDialog(false);
              }}
            />
          )}

          {showHospitalManage && (
            <LookupManageDialog
              type="hospital"
              open={showHospitalManage}
              onOpenChange={setShowHospitalManage}
              items={hospitals || []}
            />
          )}
       </div>
     </Layout>
   );
 }