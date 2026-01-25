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
 import { Save, Search, Microscope, Syringe, UserCheck, Activity } from "lucide-react";
 import SearchableSelect from "@/components/SearchableSelect";
 import LookupCreateDialog, { type LookupCreateType } from "@/components/LookupCreateDialog";
 import LookupManageDialog from "@/components/LookupManageDialog";
 import { Database } from "@/integrations/supabase/types";
 
type ProcedureType = "procedure" | "reception" | "kidney";
 
 const procedureSchema = z.object({
   unified_number: z.string().min(1, "الرقم الموحد مطلوب"),
   patient_name: z.string().min(4, "الاسم رباعي مطلوب"),
   national_id: z.string().length(14, "الرقم القومي يجب أن يكون 14 رقم"),
   gender: z.enum(["ذكر", "أنثى"]),
   occupation_id: z.string().optional(),
   marital_status: z.enum(["أعزب", "متزوج", "مطلق", "أرمل"]),
   phone: z.string().length(11, "رقم الهاتف يجب أن يكون 11 رقم"),
   age: z.coerce.number().min(0, "السن يجب أن يكون رقم موجب"),
   governorate_id: z.string().optional(),
   district_id: z.string().optional(),
   address_details: z.string().optional(),
   station_id: z.string().optional(),
   department_id: z.string().min(1, "قسم الدخول مطلوب"),
   discharge_department_id: z.string().min(1, "قسم الخروج مطلوب"),
   diagnosis_id: z.string().optional(),
   doctor_id: z.string().optional(),
   procedure_date: z.string().min(1, "تاريخ الإجراء مطلوب"),
 });
 
 type ProcedureFormValues = z.infer<typeof procedureSchema>;

type AdmissionData = Database["public"]["Tables"]["admissions"]["Row"];
 
 export default function MedicalProcedures() {
   const { toast } = useToast();
   const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ProcedureType>("procedure");
   const [searchNumber, setSearchNumber] = useState("");
   const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [selectedAdmission, setSelectedAdmission] = useState<AdmissionData | null>(null);
 const [manageLookupType, setManageLookupType] = useState<LookupCreateType | null>(null);
 const [createLookupType, setCreateLookupType] = useState<LookupCreateType | null>(null);
 
   const form = useForm<ProcedureFormValues>({
     resolver: zodResolver(procedureSchema),
     defaultValues: {
       procedure_date: new Date().toISOString().slice(0, 16),
     },
   });
 
   // Fetch lookup data
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
 
   const { start, end } = getTimeRangeDates(timeRange);
 
   // Get counts for each procedure type from procedures table
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
 
   const handleSearch = async () => {
     if (!searchNumber.trim()) {
       toast({
         title: "خطأ",
         description: "الرجاء إدخال الرقم الموحد",
         variant: "destructive",
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
       });
      setSelectedAdmission(null);
       return;
     }
 
    // Store admission data for display
    setSelectedAdmission(data);

     // Auto-set admission and discharge department based on selected tab
     const departmentMap: Record<ProcedureType, string> = {
       procedure: "بذل",
       reception: "استقبال",
       kidney: "كلي"
     };
 
     const targetDeptName = departmentMap[activeTab];
     const targetDept = departments?.find(d => d.name === targetDeptName);
 
    // Fill form with admission data (like discharge page)
    form.reset({
      unified_number: data.unified_number,
      patient_name: data.patient_name,
      national_id: data.national_id,
      gender: data.gender as any,
      occupation_id: data.occupation_id || undefined,
      marital_status: data.marital_status as any,
      phone: data.phone,
      age: data.age,
      governorate_id: data.governorate_id || undefined,
      district_id: data.district_id || undefined,
      address_details: data.address_details || undefined,
      station_id: data.station_id || undefined,
      department_id: targetDept?.id || data.department_id,
      discharge_department_id: targetDept?.id || data.department_id,
      diagnosis_id: data.diagnosis_id || undefined,
      doctor_id: data.doctor_id || undefined,
      procedure_date: new Date().toISOString().slice(0, 16),
    });

   };
 
   const mutation = useMutation({
     mutationFn: async (values: ProcedureFormValues) => {
       const typeMap: Record<ProcedureType, string> = {
         procedure: "بذل",
         reception: "استقبال",
         kidney: "كلي"
       };
 
       const insertData: any = {
         unified_number: values.unified_number,
         patient_name: values.patient_name,
         national_id: values.national_id,
         gender: values.gender,
         marital_status: values.marital_status,
         phone: values.phone,
         age: Number(values.age),
         department_id: values.department_id,
         discharge_department_id: values.discharge_department_id,
         procedure_date: values.procedure_date,
         procedure_type: typeMap[activeTab],
         occupation_id: values.occupation_id || null,
         governorate_id: values.governorate_id || null,
         district_id: values.district_id || null,
         address_details: values.address_details || null,
         station_id: values.station_id || null,
         diagnosis_id: values.diagnosis_id || null,
         doctor_id: values.doctor_id || null,
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
      const typeLabel = activeTab === "procedure" ? "بذل" : activeTab === "reception" ? "استقبال" : "كلي";
       toast({
         title: "تم الحفظ بنجاح",
         description: `تم تسجيل ${typeLabel} للمريض ${data.patient_name}`,
       });
       form.reset({
         procedure_date: new Date().toISOString().slice(0, 16),
       });
       setSearchNumber("");
     },
     onError: (error: any) => {
       toast({
         title: "خطأ في الحفظ",
         description: error.message,
         variant: "destructive",
       });
     },
   });
 
   const onSubmit = (data: ProcedureFormValues) => {
     mutation.mutate(data);
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
               color="green"
               onClick={() => setActiveTab("procedure")}
               active={activeTab === "procedure"}
             />
             <ColoredStatTab
               title="الاستقبال"
               value={procedureCounts?.reception ?? 0}
               subtitle={`خلال ${timeRange === "day" ? "اليوم" : timeRange === "week" ? "الأسبوع" : timeRange === "month" ? "الشهر" : "3 أشهر"}`}
               icon={UserCheck}
               color="cyan"
               onClick={() => setActiveTab("reception")}
               active={activeTab === "reception"}
             />
             <ColoredStatTab
               title="الكلي"
               value={procedureCounts?.kidney ?? 0}
               subtitle={`خلال ${timeRange === "day" ? "اليوم" : timeRange === "week" ? "الأسبوع" : timeRange === "month" ? "الشهر" : "3 أشهر"}`}
               icon={Activity}
               color="orange"
               onClick={() => setActiveTab("kidney")}
               active={activeTab === "kidney"}
             />
           </div>
         </div>
 
        {/* Patient Data Display Card */}
        {selectedAdmission && (
          <Card className="shadow-lg border-primary/20 bg-gradient-to-br from-card to-card/95">
            <CardHeader className="pb-3">
              <CardTitle className="text-primary">بيانات المريض</CardTitle>
              <CardDescription>معلومات الدخول للرقم الموحد: {selectedAdmission.unified_number}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 text-sm">
                <div>
                  <span className="font-semibold text-muted-foreground">الاسم: </span>
                  <span className="text-foreground">{selectedAdmission.patient_name}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">الرقم القومي: </span>
                  <span className="text-foreground">{selectedAdmission.national_id}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">الهاتف: </span>
                  <span className="text-foreground">{selectedAdmission.phone}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">النوع: </span>
                  <span className="text-foreground">{selectedAdmission.gender}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">السن: </span>
                  <span className="text-foreground">{selectedAdmission.age} سنة</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">الحالة الاجتماعية: </span>
                  <span className="text-foreground">{selectedAdmission.marital_status}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">المهنة: </span>
                  <span className="text-foreground">
                    {occupations?.find((o) => o.id === selectedAdmission.occupation_id)?.name || "-"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">المحافظة: </span>
                  <span className="text-foreground">
                    {governorates?.find((g) => g.id === selectedAdmission.governorate_id)?.name || "-"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">المركز: </span>
                  <span className="text-foreground">
                    {districts?.find((d) => d.id === selectedAdmission.district_id)?.name || "-"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">المحطة: </span>
                  <span className="text-foreground">
                    {stations?.find((s) => s.id === selectedAdmission.station_id)?.name || "-"}
                  </span>
                </div>
                <div className="md:col-span-3">
                  <span className="font-semibold text-muted-foreground">العنوان التفصيلي: </span>
                  <span className="text-foreground">{selectedAdmission.address_details || "-"}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">القسم: </span>
                  <span className="text-foreground">
                    {departments?.find((d) => d.id === selectedAdmission.department_id)?.name || "-"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">التشخيص: </span>
                  <span className="text-foreground">
                    {diagnoses?.find((d) => d.id === selectedAdmission.diagnosis_id)?.name || "-"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">الطبيب: </span>
                  <span className="text-foreground">
                    {doctors?.find((d) => d.id === selectedAdmission.doctor_id)?.name || "-"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">تاريخ الدخول: </span>
                  <span className="text-foreground">
                    {new Date(selectedAdmission.admission_date).toLocaleString("ar-EG")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

         <Card className="shadow-lg border-border">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Icon className={`h-5 w-5 ${tabInfo.color}`} />
               {tabInfo.title}
             </CardTitle>
             <CardDescription>ابحث بالرقم الموحد لتحميل بيانات المريض</CardDescription>
           </CardHeader>
 
           <CardContent className="space-y-6">
             {/* Search Section */}
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
 
             {/* Form */}
             <Form {...form}>
               <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                 <div className="grid gap-4 md:grid-cols-3">
                   <FormField
                     control={form.control}
                     name="unified_number"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>الرقم الموحد *</FormLabel>
                         <FormControl>
                           <Input placeholder="أدخل الرقم الموحد" {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
 
                   <FormField
                     control={form.control}
                     name="patient_name"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>اسم المريض (رباعي) *</FormLabel>
                         <FormControl>
                           <Input placeholder="الاسم الرباعي الكامل" {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
 
                   <FormField
                     control={form.control}
                     name="national_id"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>الرقم القومي (14 رقم) *</FormLabel>
                         <FormControl>
                           <Input placeholder="12345678901234" maxLength={14} {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
 
                   <FormField
                     control={form.control}
                     name="gender"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>النوع *</FormLabel>
                         <Select onValueChange={field.onChange} value={field.value}>
                           <FormControl>
                             <SelectTrigger>
                               <SelectValue placeholder="اختر النوع" />
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
                     control={form.control}
                     name="age"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>السن *</FormLabel>
                         <FormControl>
                           <Input type="number" placeholder="السن" {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
 
                   <FormField
                     control={form.control}
                     name="phone"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>رقم الهاتف (11 رقم) *</FormLabel>
                         <FormControl>
                           <Input placeholder="01234567890" maxLength={11} {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
 
                   <FormField
                     control={form.control}
                     name="marital_status"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>الحالة الاجتماعية *</FormLabel>
                         <Select onValueChange={field.onChange} value={field.value}>
                           <FormControl>
                             <SelectTrigger>
                               <SelectValue placeholder="اختر الحالة" />
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
                     control={form.control}
                     name="department_id"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>قسم الدخول *</FormLabel>
                         <FormControl>
                           <SearchableSelect
                             value={field.value}
                       onValueChange={field.onChange}
                         options={departments || []}
                             placeholder="اختر قسم الدخول"
                         onAddNew={() => setCreateLookupType("department")}
                         onManage={() => setManageLookupType("department")}
                           />
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
                         <FormLabel>قسم الخروج *</FormLabel>
                         <FormControl>
                           <SearchableSelect
                             value={field.value}
                       onValueChange={field.onChange}
                         options={departments || []}
                             placeholder="اختر قسم الخروج"
                         onAddNew={() => setCreateLookupType("department")}
                         onManage={() => setManageLookupType("department")}
                           />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
 
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
                         onAddNew={() => setCreateLookupType("diagnosis")}
                         onManage={() => setManageLookupType("diagnosis")}
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
                         onAddNew={() => setCreateLookupType("doctor")}
                         onManage={() => setManageLookupType("doctor")}
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
                            onAddNew={() => setCreateLookupType("occupation")}
                            onManage={() => setManageLookupType("occupation")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
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
                            onAddNew={() => setCreateLookupType("governorate")}
                            onManage={() => setManageLookupType("governorate")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
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
                            onAddNew={() => setCreateLookupType("district")}
                            onManage={() => setManageLookupType("district")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
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
                            onAddNew={() => setCreateLookupType("station")}
                            onManage={() => setManageLookupType("station")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address_details"
                    render={({ field }) => (
                      <FormItem className="md:col-span-3">
                        <FormLabel>العنوان التفصيلي</FormLabel>
                        <FormControl>
                          <Input placeholder="أدخل العنوان التفصيلي" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                 </div>
 
                 <div className="flex justify-end gap-2">
                   <Button type="button" variant="outline" onClick={() => form.reset()}>
                     إلغاء
                   </Button>
                   <Button type="submit" disabled={mutation.isPending}>
                     <Save className="mr-2 h-4 w-4" />
                     {mutation.isPending ? "جاري الحفظ..." : "حفظ البيانات"}
                   </Button>
                 </div>
               </form>
             </Form>
           </CardContent>
         </Card>
 
         {/* Lookup Dialogs */}
         {createLookupType && (
           <LookupCreateDialog
             type={createLookupType}
             open={!!createLookupType}
             onOpenChange={(open) => !open && setCreateLookupType(null)}
             onCreated={(item) => {
             if (createLookupType === "department") {
                 form.setValue("department_id", item.id);
             } else if (createLookupType === "diagnosis") {
                 form.setValue("diagnosis_id", item.id);
             } else if (createLookupType === "doctor") {
                 form.setValue("doctor_id", item.id);
              } else if (createLookupType === "occupation") {
                form.setValue("occupation_id", item.id);
              } else if (createLookupType === "governorate") {
                form.setValue("governorate_id", item.id);
              } else if (createLookupType === "district") {
                form.setValue("district_id", item.id);
              } else if (createLookupType === "station") {
                form.setValue("station_id", item.id);
               }
               setCreateLookupType(null);
             }}
           />
         )}
 
         {manageLookupType && (
           <LookupManageDialog
             type={manageLookupType}
             open={!!manageLookupType}
             onOpenChange={(open) => !open && setManageLookupType(null)}
             items={
               manageLookupType === "department"
                 ? departments || []
                 : manageLookupType === "diagnosis"
                 ? diagnoses || []
                 : manageLookupType === "doctor"
                 ? doctors || []
                : manageLookupType === "occupation"
                ? occupations || []
                : manageLookupType === "governorate"
                ? governorates || []
                : manageLookupType === "district"
                ? districts || []
                : manageLookupType === "station"
                ? stations || []
                 : []
             }
           />
         )}
       </div>
     </Layout>
   );
 }