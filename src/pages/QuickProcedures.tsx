 import { useState } from "react";
 import { useForm } from "react-hook-form";
 import { zodResolver } from "@hookform/resolvers/zod";
 import { z } from "zod";
 import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import Layout from "@/components/Layout";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
 import { Input } from "@/components/ui/input";
 import { Button } from "@/components/ui/button";
 import { Textarea } from "@/components/ui/textarea";
 import SearchableSelect from "@/components/SearchableSelect";
 import { Search, Zap } from "lucide-react";
 import { format } from "date-fns";
 
 const quickProcedureSchema = z.object({
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
   department_id: z.string().min(1, "قسم الحجز مطلوب"),
   admission_status: z.enum(["محجوز", "خروج", "متوفى", "تحويل"]),
   diagnosis_id: z.string().optional(),
   doctor_id: z.string().optional(),
   admission_date: z.string().min(1, "تاريخ الحجز مطلوب"),
 });
 
 type QuickProcedureFormValues = z.infer<typeof quickProcedureSchema>;
 
 export default function QuickProcedures() {
   const { toast } = useToast();
   const queryClient = useQueryClient();
   const [searchNumber, setSearchNumber] = useState("");
   const [foundAdmission, setFoundAdmission] = useState<any>(null);
   const [isEditMode, setIsEditMode] = useState(false);
 
   // Fetch lookup data
   const { data: departments } = useQuery({
     queryKey: ["departments"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("departments")
         .select("*")
         .order("name");
       if (error) throw error;
       return data;
     },
   });
 
   const { data: doctors } = useQuery({
     queryKey: ["doctors"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("doctors")
         .select("*")
         .order("name");
       if (error) throw error;
       return data;
     },
   });
 
   const { data: diagnoses } = useQuery({
     queryKey: ["diagnoses"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("diagnoses")
         .select("*")
         .order("name");
       if (error) throw error;
       return data;
     },
   });
 
   const { data: governorates } = useQuery({
     queryKey: ["governorates"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("governorates")
         .select("*")
         .order("name");
       if (error) throw error;
       return data;
     },
   });
 
   const { data: districts } = useQuery({
     queryKey: ["districts"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("districts")
         .select("*")
         .order("name");
       if (error) throw error;
       return data;
     },
   });
 
   const { data: stations } = useQuery({
     queryKey: ["stations"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("stations")
         .select("*")
         .order("name");
       if (error) throw error;
       return data;
     },
   });
 
   const { data: occupations } = useQuery({
     queryKey: ["occupations"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("occupations")
         .select("*")
         .order("name");
       if (error) throw error;
       return data;
     },
   });
 
   const form = useForm<QuickProcedureFormValues>({
     resolver: zodResolver(quickProcedureSchema),
     defaultValues: {
       unified_number: "",
       patient_name: "",
       national_id: "",
       gender: "ذكر",
       occupation_id: "",
       marital_status: "أعزب",
       phone: "",
       age: 0,
       governorate_id: "",
       district_id: "",
       address_details: "",
       station_id: "",
       department_id: "",
       admission_status: "محجوز",
       diagnosis_id: "",
       doctor_id: "",
       admission_date: new Date().toISOString().slice(0, 16),
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
       .select("*, departments(name), doctors(name), diagnoses(name), governorates(name), districts(name), stations(name), occupations(name)")
       .eq("unified_number", searchNumber)
       .maybeSingle();
 
     if (error || !data) {
       toast({
         title: "الرقم الموحد غير موجود",
         description: "يمكنك إدخال بيانات جديدة للمريض",
       });
       setFoundAdmission(null);
       setIsEditMode(true);
       form.reset({
         unified_number: searchNumber,
         patient_name: "",
         national_id: "",
         gender: "ذكر",
         occupation_id: "",
         marital_status: "أعزب",
         phone: "",
         age: 0,
         governorate_id: "",
         district_id: "",
         address_details: "",
         station_id: "",
         department_id: "",
         admission_status: "محجوز",
         diagnosis_id: "",
         doctor_id: "",
         admission_date: new Date().toISOString().slice(0, 16),
       });
       return;
     }
 
     setFoundAdmission(data);
     setIsEditMode(false);
     form.reset({
       unified_number: data.unified_number,
       patient_name: data.patient_name,
       national_id: data.national_id,
       gender: data.gender as any,
       occupation_id: data.occupation_id || "",
       marital_status: data.marital_status as any,
       phone: data.phone,
       age: data.age,
       governorate_id: data.governorate_id || "",
       district_id: data.district_id || "",
       address_details: data.address_details || "",
       station_id: data.station_id || "",
       department_id: data.department_id,
       admission_status: data.admission_status as any,
       diagnosis_id: data.diagnosis_id || "",
       doctor_id: data.doctor_id || "",
       admission_date: data.admission_date ? format(new Date(data.admission_date), "yyyy-MM-dd'T'HH:mm") : new Date().toISOString().slice(0, 16),
     });
 
     toast({
       title: "تم العثور على المريض",
       description: `${data.patient_name} - ${data.unified_number}`,
     });
   };
 
   const saveMutation = useMutation({
     mutationFn: async (values: QuickProcedureFormValues) => {
       if (foundAdmission) {
         // Update existing admission
         const { error } = await supabase
           .from("admissions")
           .update({
             patient_name: values.patient_name,
             national_id: values.national_id,
             gender: values.gender,
             occupation_id: values.occupation_id || null,
             marital_status: values.marital_status,
             phone: values.phone,
             age: values.age,
             governorate_id: values.governorate_id || null,
             district_id: values.district_id || null,
             address_details: values.address_details || null,
             station_id: values.station_id || null,
             department_id: values.department_id,
             admission_status: values.admission_status,
             diagnosis_id: values.diagnosis_id || null,
             doctor_id: values.doctor_id || null,
             admission_date: values.admission_date,
             updated_at: new Date().toISOString(),
           })
           .eq("id", foundAdmission.id);
 
         if (error) throw error;
       } else {
         // Insert new admission
         const { error } = await supabase
           .from("admissions")
           .insert({
             unified_number: values.unified_number,
             patient_name: values.patient_name,
             national_id: values.national_id,
             gender: values.gender,
             occupation_id: values.occupation_id || null,
             marital_status: values.marital_status,
             phone: values.phone,
             age: values.age,
             governorate_id: values.governorate_id || null,
             district_id: values.district_id || null,
             address_details: values.address_details || null,
             station_id: values.station_id || null,
             department_id: values.department_id,
             admission_status: values.admission_status,
             diagnosis_id: values.diagnosis_id || null,
             doctor_id: values.doctor_id || null,
             admission_date: values.admission_date,
           });
 
         if (error) throw error;
       }
     },
     onSuccess: () => {
       toast({
         title: "تم الحفظ بنجاح",
         description: foundAdmission ? "تم تحديث بيانات المريض" : "تم إضافة المريض بنجاح",
       });
       queryClient.invalidateQueries({ queryKey: ["admissions"] });
       setSearchNumber("");
       setFoundAdmission(null);
       setIsEditMode(false);
       form.reset();
     },
     onError: (error: any) => {
       toast({
         title: "خطأ في الحفظ",
         description: error.message,
         variant: "destructive",
       });
     },
   });
 
   const onSubmit = (values: QuickProcedureFormValues) => {
     saveMutation.mutate(values);
   };
 
   return (
     <Layout>
       <div className="space-y-6">
         {/* Header */}
         <div>
           <div className="flex items-center gap-2 mb-2">
             <Zap className="h-6 w-6 text-primary" />
             <h1 className="text-3xl font-bold">الإجراءات السريعة</h1>
           </div>
           <p className="text-muted-foreground">
             البحث والإدخال السريع لبيانات المرضى
           </p>
         </div>
 
         {/* Search Card */}
         <Card>
           <CardHeader>
             <CardTitle>البحث بالرقم الموحد</CardTitle>
             <CardDescription>
               أدخل الرقم الموحد للمريض للبحث عن سجله أو إضافة بيانات جديدة
             </CardDescription>
           </CardHeader>
           <CardContent>
             <div className="flex gap-2">
               <Input
                 type="text"
                 placeholder="الرقم الموحد"
                 value={searchNumber}
                 onChange={(e) => setSearchNumber(e.target.value)}
                 onKeyDown={(e) => {
                   if (e.key === "Enter") {
                     e.preventDefault();
                     handleSearch();
                   }
                 }}
                 className="flex-1"
               />
               <Button onClick={handleSearch} className="gap-2">
                 <Search className="h-4 w-4" />
                 بحث
               </Button>
             </div>
           </CardContent>
         </Card>
 
         {/* Data Display or Form */}
         {(foundAdmission || isEditMode) && (
           <Card>
             <CardHeader>
               <CardTitle>
                 {foundAdmission ? "بيانات الدخول - للمراجعة والتعديل" : "إدخال بيانات جديدة"}
               </CardTitle>
               {foundAdmission && (
                 <CardDescription>
                   تاريخ الإنشاء: {format(new Date(foundAdmission.created_at), "yyyy-MM-dd HH:mm")}
                 </CardDescription>
               )}
             </CardHeader>
             <CardContent>
               <Form {...form}>
                 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                   {/* Patient Basic Info */}
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     <FormField
                       control={form.control}
                       name="unified_number"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>الرقم الموحد <span className="text-destructive">*</span></FormLabel>
                           <FormControl>
                             <Input {...field} disabled placeholder="الرقم الموحد" />
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
                           <FormLabel>اسم المريض (رباعي) <span className="text-destructive">*</span></FormLabel>
                           <FormControl>
                             <Input {...field} placeholder="الاسم الرباعي" />
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
                           <FormLabel>الرقم القومي <span className="text-destructive">*</span></FormLabel>
                           <FormControl>
                             <Input {...field} placeholder="14 رقم" maxLength={14} />
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
                           <FormLabel>النوع <span className="text-destructive">*</span></FormLabel>
                           <FormControl>
                             <SearchableSelect
                               value={field.value}
                               onValueChange={field.onChange}
                              options={[
                                { id: "ذكر", name: "ذكر" },
                                { id: "أنثى", name: "أنثى" },
                              ]}
                               placeholder="اختر النوع"
                             />
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
                             />
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
                           <FormLabel>الحالة الاجتماعية <span className="text-destructive">*</span></FormLabel>
                           <FormControl>
                             <SearchableSelect
                               value={field.value}
                               onValueChange={field.onChange}
                              options={[
                                { id: "أعزب", name: "أعزب" },
                                { id: "متزوج", name: "متزوج" },
                                { id: "مطلق", name: "مطلق" },
                                { id: "أرمل", name: "أرمل" },
                              ]}
                               placeholder="اختر الحالة"
                             />
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
                           <FormLabel>رقم الهاتف <span className="text-destructive">*</span></FormLabel>
                           <FormControl>
                             <Input {...field} placeholder="11 رقم" maxLength={11} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
 
                     <FormField
                       control={form.control}
                       name="age"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>السن <span className="text-destructive">*</span></FormLabel>
                           <FormControl>
                             <Input type="number" {...field} placeholder="السن" />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                   </div>
 
                   {/* Location Info */}
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                           <FormLabel>القسم أو المركز</FormLabel>
                           <FormControl>
                             <SearchableSelect
                               value={field.value}
                               onValueChange={field.onChange}
                              options={districts || []}
                               placeholder="اختر القسم أو المركز"
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
                         <FormItem className="md:col-span-2 lg:col-span-3">
                           <FormLabel>العنوان تفصيلي</FormLabel>
                           <FormControl>
                             <Textarea {...field} placeholder="العنوان التفصيلي" rows={2} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                   </div>
 
                   {/* Administrative Info */}
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     <FormField
                       control={form.control}
                       name="department_id"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>قسم الحجز <span className="text-destructive">*</span></FormLabel>
                           <FormControl>
                             <SearchableSelect
                               value={field.value}
                               onValueChange={field.onChange}
                              options={departments || []}
                               placeholder="اختر القسم"
                             />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
 
                     <FormField
                       control={form.control}
                       name="admission_status"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>الحالة <span className="text-destructive">*</span></FormLabel>
                           <FormControl>
                             <SearchableSelect
                               value={field.value}
                               onValueChange={field.onChange}
                              options={[
                                { id: "محجوز", name: "محجوز" },
                                { id: "خروج", name: "خروج" },
                                { id: "متوفى", name: "متوفى" },
                                { id: "تحويل", name: "تحويل" },
                              ]}
                               placeholder="اختر الحالة"
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
                             />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
 
                     <FormField
                       control={form.control}
                       name="admission_date"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>تاريخ الحجز <span className="text-destructive">*</span></FormLabel>
                           <FormControl>
                             <Input type="datetime-local" {...field} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                   </div>
 
                   {/* Actions */}
                   <div className="flex gap-2 justify-end">
                     <Button
                       type="button"
                       variant="outline"
                       onClick={() => {
                         setSearchNumber("");
                         setFoundAdmission(null);
                         setIsEditMode(false);
                         form.reset();
                       }}
                     >
                       إلغاء
                     </Button>
                     <Button type="submit" disabled={saveMutation.isPending}>
                       {saveMutation.isPending ? "جاري الحفظ..." : foundAdmission ? "تحديث البيانات" : "حفظ البيانات"}
                     </Button>
                   </div>
                 </form>
               </Form>
             </CardContent>
           </Card>
         )}
       </div>
     </Layout>
   );
 }