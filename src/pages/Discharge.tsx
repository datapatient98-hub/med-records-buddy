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
import { Search, Save, ArrowRight, TrendingUp, Shuffle, Skull, UserMinus, Ban, Edit } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";
import LookupCreateDialog from "@/components/LookupCreateDialog";
import LookupManageDialog from "@/components/LookupManageDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const dischargeSchema = z.object({
  discharge_date: z.string().min(1, "تاريخ الخروج مطلوب"),
  discharge_department_id: z.string().optional(),
  discharge_diagnosis_id: z.string().optional(),
  discharge_doctor_id: z.string().optional(),
  discharge_status: z.enum(["تحسن", "تحويل", "وفاة", "هروب", "رفض العلاج"]),
  hospital_id: z.string().optional(),
  finance_source: z.enum(["تأمين صحي", "علاج على نفقة الدولة", "خاص"]).optional(),
  child_national_id: z.string().optional(),
});

type DischargeFormValues = z.infer<typeof dischargeSchema>;

export default function Discharge() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [unifiedNumber, setUnifiedNumber] = useState("");
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null);
  const [showDischargeForm, setShowDischargeForm] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [selectedTab, setSelectedTab] = useState<"تحسن" | "تحويل" | "وفاة" | "هروب" | "رفض العلاج">("تحسن");
  const [showHospitalDialog, setShowHospitalDialog] = useState(false);
  const [showHospitalManage, setShowHospitalManage] = useState(false);
  const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
  const [showDepartmentManage, setShowDepartmentManage] = useState(false);
  const [showDiagnosisDialog, setShowDiagnosisDialog] = useState(false);
  const [showDiagnosisManage, setShowDiagnosisManage] = useState(false);
  const [showDoctorDialog, setShowDoctorDialog] = useState(false);
  const [showDoctorManage, setShowDoctorManage] = useState(false);
  const [showEditAdmissionDialog, setShowEditAdmissionDialog] = useState(false);
  const [showGovernorateDialog, setShowGovernorateDialog] = useState(false);
  const [showGovernorateManage, setShowGovernorateManage] = useState(false);
  const [showDistrictDialog, setShowDistrictDialog] = useState(false);
  const [showDistrictManage, setShowDistrictManage] = useState(false);
  const [showStationDialog, setShowStationDialog] = useState(false);
  const [showStationManage, setShowStationManage] = useState(false);
  const [showOccupationDialog, setShowOccupationDialog] = useState(false);
  const [showOccupationManage, setShowOccupationManage] = useState(false);
  const [isEmergencyFile, setIsEmergencyFile] = useState(false);

  const form = useForm<DischargeFormValues>({
    resolver: zodResolver(dischargeSchema),
    defaultValues: {
      discharge_date: new Date().toISOString().slice(0, 16),
      discharge_status: "تحسن",
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

  const dischargeStatus = form.watch("discharge_status");

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

  const { data: governorates } = useQuery({
    queryKey: ["governorates"],
    queryFn: async () => {
      const { data } = await supabase.from("governorates").select("*").order("name");
      return data || [];
    },
  });

  const { data: hospitals } = useQuery({
    queryKey: ["hospitals"],
    queryFn: async () => {
      const { data } = await supabase.from("hospitals").select("*").order("name");
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

  const { data: stations } = useQuery({
    queryKey: ["stations"],
    queryFn: async () => {
      const { data } = await supabase.from("stations").select("*").order("name");
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

  // Top stats (discharge status) with time filter
  const { start, end } = getTimeRangeDates(timeRange);
  
  const dischargeStatuses = useMemo(
    () => [
      { key: "تحسن" as const, label: "تحسن", icon: TrendingUp, color: "green" as const },
      { key: "تحويل" as const, label: "تحويل", icon: Shuffle, color: "cyan" as const },
      { key: "وفاة" as const, label: "وفاة", icon: Skull, color: "pink" as const },
      { key: "هروب" as const, label: "هروب", icon: UserMinus, color: "purple" as const },
      { key: "رفض العلاج" as const, label: "رفض العلاج حسب الطلب", icon: Ban, color: "orange" as const },
    ],
    []
  );

  const { data: dischargeCounts } = useQuery({
    queryKey: ["discharges-counts", timeRange],
    queryFn: async () => {
      const entries = await Promise.all(
        dischargeStatuses.map(async (s) => {
          const { count, error } = await supabase
            .from("discharges")
            .select("id", { count: "exact", head: true })
            .eq("discharge_status", s.key)
            .gte("discharge_date", start.toISOString())
            .lte("discharge_date", end.toISOString());
          if (error) throw error;
          return [s.key, count ?? 0] as const;
        })
      );
      return Object.fromEntries(entries) as Record<(typeof dischargeStatuses)[number]["key"], number>;
    },
  });

  const handleSearch = async () => {
    if (!unifiedNumber.trim()) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال الرقم الموحد",
        variant: "destructive",
      });
      return;
    }

    // Fetch all admissions with this unified number that are still "محجوز"
    const { data: admissions, error } = await supabase
      .from("admissions")
      .select("*, departments(name), doctors(name), diagnoses(name), governorates(name)")
      .eq("unified_number", unifiedNumber)
      .eq("admission_status", "محجوز");

    if (error || !admissions || admissions.length === 0) {
      toast({
        title: "لم يتم العثور على المريض",
        description: "تأكد من الرقم الموحد أو أن المريض مازال محجوزاً",
        variant: "destructive",
      });
      return;
    }

    // Prioritize Emergency files (طوارئ) over Internal (داخلي)
    const emergencyAdmission = admissions.find((a: any) => a.admission_source === "طوارئ");
    const data = emergencyAdmission || admissions[0];
    
    setIsEmergencyFile(data.admission_source === "طوارئ");
    setSelectedAdmission(data);
    setShowDischargeForm(false);
    // Set default discharge department to admission department
    form.setValue("discharge_department_id", data.department_id);
    form.setValue("discharge_diagnosis_id", data.diagnosis_id || "");
    form.setValue("discharge_doctor_id", data.doctor_id || "");
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
      
      // Reload admission data
      const { data: updatedAdmissions } = await supabase
        .from("admissions")
        .select("*, departments(name), doctors(name), diagnoses(name), governorates(name)")
        .eq("unified_number", unifiedNumber)
        .eq("admission_status", "محجوز");

      if (updatedAdmissions && updatedAdmissions.length > 0) {
        const emergencyAdmission = updatedAdmissions.find((a: any) => a.admission_source === "طوارئ");
        const updatedData = emergencyAdmission || updatedAdmissions[0];
        
        setIsEmergencyFile(updatedData.admission_source === "طوارئ");
        setSelectedAdmission(updatedData);
        form.setValue("discharge_department_id", updatedData.department_id);
        form.setValue("discharge_diagnosis_id", updatedData.diagnosis_id || "");
        form.setValue("discharge_doctor_id", updatedData.doctor_id || "");
      }

      setShowEditAdmissionDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في التحديث",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: DischargeFormValues) => {
      if (!selectedAdmission) return;

      // Insert discharge record
      const { data: dischargeData, error: dischargeError } = await supabase
        .from("discharges")
        .insert([{
          admission_id: selectedAdmission.id,
          discharge_date: values.discharge_date,
          discharge_department_id: values.discharge_department_id || null,
          discharge_diagnosis_id: values.discharge_diagnosis_id || null,
          discharge_doctor_id: values.discharge_doctor_id || null,
          discharge_status: values.discharge_status as any,
          hospital_id: values.hospital_id || null,
          finance_source: values.finance_source as any || null,
          child_national_id: values.child_national_id || null,
        }])
        .select("internal_number")
        .single();

      if (dischargeError) throw dischargeError;

      // Update admission status
      const { error: updateError } = await supabase
        .from("admissions")
        .update({ admission_status: "خروج" as any })
        .eq("id", selectedAdmission.id);

      if (updateError) throw updateError;

      return { 
        admission: selectedAdmission, 
        internalNumber: dischargeData?.internal_number 
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      queryClient.invalidateQueries({ queryKey: ["discharges"] });
      queryClient.invalidateQueries({ queryKey: ["discharges-counts"] });
      toast({
        title: "تم الحفظ بنجاح",
        description: data?.internalNumber 
          ? `تم تسجيل خروج المريض ${data.admission.patient_name}\n\n🔢 الرقم الداخلي: ${data.internalNumber}`
          : `تم تسجيل خروج المريض ${data?.admission.patient_name}`,
      });
      // Reset form
      setSelectedAdmission(null);
      setUnifiedNumber("");
      setShowDischargeForm(false);
      setIsEmergencyFile(false);
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

  const onSubmit = (data: DischargeFormValues) => {
    mutation.mutate(data);
  };

  const handleEditAdmission = () => {
    if (!selectedAdmission) return;
    
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
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">تسجيل خروج مريض</h2>
            <p className="text-muted-foreground">البحث عن المريض وتسجيل بيانات الخروج</p>
          </div>
          <TimeFilter value={timeRange} onChange={setTimeRange} />
        </div>

        {/* Colored Tabs */}
        <div className="sticky top-16 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
            {dischargeStatuses.map((s) => (
              <ColoredStatTab
                key={s.key}
                title={s.label}
                value={dischargeCounts?.[s.key] ?? 0}
                subtitle={`خلال ${
                  timeRange === "day" ? "اليوم" : 
                  timeRange === "week" ? "الأسبوع" : 
                  timeRange === "month" ? "الشهر" : 
                  "3 أشهر"
                }`}
                icon={s.icon}
                color={s.color}
                onClick={() => setSelectedTab(s.key)}
                active={selectedTab === s.key}
              />
            ))}
          </div>
        </div>

        {/* Search Section */}
        <Card className="shadow-lg border-border">
          <CardHeader>
            <CardTitle>بحث عن المريض</CardTitle>
            <CardDescription>أدخل الرقم الموحد للمريض</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="الرقم الموحد"
                value={unifiedNumber}
                onChange={(e) => setUnifiedNumber(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch}>
                <Search className="ml-2 h-4 w-4" />
                بحث
              </Button>
            </div>
          </CardContent>
        </Card>

      {/* Admission Details */}
      {selectedAdmission && !showDischargeForm && (
        <>
          {isEmergencyFile && (
            <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
              <AlertDescription className="text-amber-800 dark:text-amber-300 font-semibold text-base">
                ⚠️ هذا ملف طوارئ - سيتم استكمال بيانات الخروج من القسم الداخلي
              </AlertDescription>
            </Alert>
          )}
        
        <Card className="shadow-lg border-border">
          <CardHeader>
            <CardTitle>بيانات الدخول - للمراجعة والتعديل</CardTitle>
            <CardDescription>يمكنك مراجعة البيانات قبل المتابعة لتسجيل الخروج</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">الرقم الموحد</p>
                <p className="font-semibold">{selectedAdmission.unified_number}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">اسم المريض</p>
                <p className="font-semibold">{selectedAdmission.patient_name}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">الرقم القومي</p>
                <p className="font-semibold">{selectedAdmission.national_id}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">الهاتف</p>
                <p className="font-semibold">{selectedAdmission.phone}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">النوع</p>
                <p className="font-semibold">{selectedAdmission.gender}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">السن</p>
                <p className="font-semibold">{selectedAdmission.age}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">الحالة الاجتماعية</p>
                <p className="font-semibold">{selectedAdmission.marital_status}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">المحافظة</p>
                <p className="font-semibold">{selectedAdmission.governorates?.name || "-"}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">العنوان التفصيلي</p>
                <p className="font-semibold text-xs">{selectedAdmission.address_details || "-"}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">القسم</p>
                <p className="font-semibold">{selectedAdmission.departments?.name || "-"}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">تاريخ الحجز</p>
                <p className="font-semibold">
                  {new Date(selectedAdmission.admission_date).toLocaleString("ar-EG")}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">التشخيص</p>
                <p className="font-semibold">{selectedAdmission.diagnoses?.name || "-"}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">الطبيب</p>
                <p className="font-semibold">{selectedAdmission.doctors?.name || "-"}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleEditAdmission} variant="outline" className="flex-1">
                <Edit className="ml-2 h-4 w-4" />
                تعديل بيانات الدخول
              </Button>
              <Button onClick={() => setShowDischargeForm(true)} className="flex-1">
                <ArrowRight className="ml-2 h-4 w-4" />
                المتابعة لتسجيل الخروج
              </Button>
            </div>
          </CardContent>
        </Card>
        </>
      )}

      {/* Discharge Form */}
      {selectedAdmission && showDischargeForm && (
        <Card className="shadow-lg border-border">
          <CardHeader>
            <CardTitle>بيانات الخروج</CardTitle>
            <CardDescription>يرجى ملء بيانات الخروج</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="discharge_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاريخ وساعة الخروج *</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discharge_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>حالة الخروج *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر حالة الخروج" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="تحسن">تحسن</SelectItem>
                            <SelectItem value="تحويل">تحويل</SelectItem>
                            <SelectItem value="وفاة">وفاة</SelectItem>
                            <SelectItem value="هروب">هروب</SelectItem>
                            <SelectItem value="رفض العلاج">رفض العلاج حسب الطلب</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {dischargeStatus === "تحويل" && (
                    <FormField
                      control={form.control}
                      name="hospital_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>اسم المستشفى (للتحويل) *</FormLabel>
                          <FormControl>
                            <SearchableSelect
                              value={field.value || ""}
                              onValueChange={field.onChange}
                              options={hospitals?.map((h) => ({ id: h.id, name: h.name })) || []}
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
                            options={departments?.map((d) => ({ id: d.id, name: d.name })) || []}
                            placeholder="اختر أو ابحث عن قسم"
                            emptyText="لا توجد أقسام"
                            onAddNew={() => setShowDepartmentDialog(true)}
                            onManage={() => setShowDepartmentManage(true)}
                            addNewLabel="إضافة قسم"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discharge_diagnosis_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تشخيص الخروج</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            options={diagnoses?.map((d) => ({ id: d.id, name: d.name })) || []}
                            placeholder="اختر أو ابحث عن تشخيص"
                            emptyText="لا توجد تشخيصات"
                            onAddNew={() => setShowDiagnosisDialog(true)}
                            onManage={() => setShowDiagnosisManage(true)}
                            addNewLabel="إضافة تشخيص"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discharge_doctor_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>طبيب الخروج</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            options={doctors?.map((d) => ({ id: d.id, name: d.name })) || []}
                            placeholder="اختر أو ابحث عن طبيب"
                            emptyText="لا يوجد أطباء"
                            onAddNew={() => setShowDoctorDialog(true)}
                            onManage={() => setShowDoctorManage(true)}
                            addNewLabel="إضافة طبيب"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="finance_source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الوعاء المالي</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الوعاء المالي" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="تأمين صحي">تأمين صحي</SelectItem>
                            <SelectItem value="علاج على نفقة الدولة">علاج على نفقة الدولة</SelectItem>
                            <SelectItem value="خاص">خاص</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="child_national_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الرقم القومي للطفل (إن وجد)</FormLabel>
                        <FormControl>
                          <Input placeholder="14 رقم" maxLength={14} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowDischargeForm(false);
                      form.reset();
                    }}
                  >
                    رجوع
                  </Button>
                  <Button type="submit" disabled={mutation.isPending}>
                    <Save className="ml-2 h-4 w-4" />
                    {mutation.isPending 
                      ? "جاري الحفظ..." 
                      : isEmergencyFile 
                        ? "استكمال خروج الحالة من الأقسام الداخلي"
                        : "حفظ بيانات الخروج"
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <LookupCreateDialog
        open={showHospitalDialog}
        type="hospital"
        onOpenChange={setShowHospitalDialog}
        onCreated={(item) => {
          form.setValue("hospital_id", item.id);
        }}
      />

      <LookupManageDialog
        open={showHospitalManage}
        type="hospital"
        onOpenChange={setShowHospitalManage}
        items={hospitals?.map((h) => ({ id: h.id, name: h.name })) || []}
      />

      <LookupCreateDialog
        open={showDepartmentDialog}
        type="department"
        onOpenChange={setShowDepartmentDialog}
        onCreated={(item) => {
          form.setValue("discharge_department_id", item.id);
        }}
      />

      <LookupManageDialog
        open={showDepartmentManage}
        type="department"
        onOpenChange={setShowDepartmentManage}
        items={departments?.map((d) => ({ id: d.id, name: d.name })) || []}
      />

      <LookupCreateDialog
        open={showDiagnosisDialog}
        type="diagnosis"
        onOpenChange={setShowDiagnosisDialog}
        onCreated={(item) => {
          form.setValue("discharge_diagnosis_id", item.id);
        }}
      />

      <LookupManageDialog
        open={showDiagnosisManage}
        type="diagnosis"
        onOpenChange={setShowDiagnosisManage}
        items={diagnoses?.map((d) => ({ id: d.id, name: d.name })) || []}
      />

      <LookupCreateDialog
        open={showDoctorDialog}
        type="doctor"
        onOpenChange={setShowDoctorDialog}
        onCreated={(item) => {
          form.setValue("discharge_doctor_id", item.id);
        }}
      />

      <LookupManageDialog
        open={showDoctorManage}
        type="doctor"
        onOpenChange={setShowDoctorManage}
        items={doctors?.map((d) => ({ id: d.id, name: d.name })) || []}
      />

      {/* Edit Admission Dialog */}
      <Dialog open={showEditAdmissionDialog} onOpenChange={setShowEditAdmissionDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل بيانات الدخول</DialogTitle>
          </DialogHeader>
          <form onSubmit={editAdmissionForm.handleSubmit((data) => editAdmissionMutation.mutate(data))} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-1 space-y-4">
              {/* معلومات المريض الأساسية */}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">اسم المريض (رباعي) *</label>
                  <Input
                    value={editAdmissionForm.watch("patient_name")}
                    onChange={(e) => editAdmissionForm.setValue("patient_name", e.target.value)}
                    placeholder="الاسم الرباعي"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">الرقم القومي (14 رقم) *</label>
                  <Input
                    value={editAdmissionForm.watch("national_id")}
                    onChange={(e) => editAdmissionForm.setValue("national_id", e.target.value)}
                    placeholder="14 رقم"
                    maxLength={14}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">رقم الهاتف (11 رقم) *</label>
                  <Input
                    value={editAdmissionForm.watch("phone")}
                    onChange={(e) => editAdmissionForm.setValue("phone", e.target.value)}
                    placeholder="01xxxxxxxxx"
                    maxLength={11}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">النوع *</label>
                  <Select 
                    value={editAdmissionForm.watch("gender")}
                    onValueChange={(value) => editAdmissionForm.setValue("gender", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ذكر">ذكر</SelectItem>
                      <SelectItem value="أنثى">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">الحالة الاجتماعية *</label>
                  <Select 
                    value={editAdmissionForm.watch("marital_status")}
                    onValueChange={(value) => editAdmissionForm.setValue("marital_status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="أعزب">أعزب</SelectItem>
                      <SelectItem value="متزوج">متزوج</SelectItem>
                      <SelectItem value="مطلق">مطلق</SelectItem>
                      <SelectItem value="أرمل">أرمل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">السن *</label>
                  <Input
                    type="number"
                    value={editAdmissionForm.watch("age")}
                    onChange={(e) => editAdmissionForm.setValue("age", parseInt(e.target.value) || 0)}
                    placeholder="السن"
                  />
                </div>
              </div>

              {/* العنوان */}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">المحافظة</label>
                  <SearchableSelect
                    value={editAdmissionForm.watch("governorate_id")}
                    onValueChange={(value) => editAdmissionForm.setValue("governorate_id", value)}
                    options={governorates?.map((g) => ({ id: g.id, name: g.name })) || []}
                    placeholder="اختر المحافظة"
                    emptyText="لا توجد محافظات"
                    onAddNew={() => setShowGovernorateDialog(true)}
                    onManage={() => setShowGovernorateManage(true)}
                    addNewLabel="إضافة محافظة"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">المركز/الحي</label>
                  <SearchableSelect
                    value={editAdmissionForm.watch("district_id")}
                    onValueChange={(value) => editAdmissionForm.setValue("district_id", value)}
                    options={districts?.map((d) => ({ id: d.id, name: d.name })) || []}
                    placeholder="اختر المركز/الحي"
                    emptyText="لا توجد مراكز"
                    onAddNew={() => setShowDistrictDialog(true)}
                    onManage={() => setShowDistrictManage(true)}
                    addNewLabel="إضافة مركز/حي"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">المحطة</label>
                  <SearchableSelect
                    value={editAdmissionForm.watch("station_id")}
                    onValueChange={(value) => editAdmissionForm.setValue("station_id", value)}
                    options={stations?.map((s) => ({ id: s.id, name: s.name })) || []}
                    placeholder="اختر المحطة"
                    emptyText="لا توجد محطات"
                    onAddNew={() => setShowStationDialog(true)}
                    onManage={() => setShowStationManage(true)}
                    addNewLabel="إضافة محطة"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">المهنة</label>
                  <SearchableSelect
                    value={editAdmissionForm.watch("occupation_id")}
                    onValueChange={(value) => editAdmissionForm.setValue("occupation_id", value)}
                    options={occupations?.map((o) => ({ id: o.id, name: o.name })) || []}
                    placeholder="اختر المهنة"
                    emptyText="لا توجد مهن"
                    onAddNew={() => setShowOccupationDialog(true)}
                    onManage={() => setShowOccupationManage(true)}
                    addNewLabel="إضافة مهنة"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">العنوان التفصيلي</label>
                <Input
                  value={editAdmissionForm.watch("address_details")}
                  onChange={(e) => editAdmissionForm.setValue("address_details", e.target.value)}
                  placeholder="العنوان بالتفصيل"
                />
              </div>

              {/* بيانات الحجز */}
              <div>
                <label className="text-sm font-medium">قسم الحجز *</label>
                <SearchableSelect
                  value={editAdmissionForm.watch("department_id")}
                  onValueChange={(value) => editAdmissionForm.setValue("department_id", value)}
                  options={departments?.map((d) => ({ id: d.id, name: d.name })) || []}
                  placeholder="اختر أو ابحث عن قسم"
                  emptyText="لا توجد أقسام"
                  onAddNew={() => setShowDepartmentDialog(true)}
                  onManage={() => setShowDepartmentManage(true)}
                  addNewLabel="إضافة قسم"
                />
              </div>

              <div>
                <label className="text-sm font-medium">التشخيص</label>
                <SearchableSelect
                  value={editAdmissionForm.watch("diagnosis_id")}
                  onValueChange={(value) => editAdmissionForm.setValue("diagnosis_id", value)}
                  options={diagnoses?.map((d) => ({ id: d.id, name: d.name })) || []}
                  placeholder="اختر أو ابحث عن تشخيص"
                  emptyText="لا توجد تشخيصات"
                  onAddNew={() => setShowDiagnosisDialog(true)}
                  onManage={() => setShowDiagnosisManage(true)}
                  addNewLabel="إضافة تشخيص"
                />
              </div>

              <div>
                <label className="text-sm font-medium">الطبيب</label>
                <SearchableSelect
                  value={editAdmissionForm.watch("doctor_id")}
                  onValueChange={(value) => editAdmissionForm.setValue("doctor_id", value)}
                  options={doctors?.map((d) => ({ id: d.id, name: d.name })) || []}
                  placeholder="اختر أو ابحث عن طبيب"
                  emptyText="لا يوجد أطباء"
                  onAddNew={() => setShowDoctorDialog(true)}
                  onManage={() => setShowDoctorManage(true)}
                  addNewLabel="إضافة طبيب"
                />
              </div>

              <div>
                <label className="text-sm font-medium">تاريخ وساعة الدخول *</label>
                <Input
                  type="datetime-local"
                  value={editAdmissionForm.watch("admission_date")}
                  onChange={(e) => editAdmissionForm.setValue("admission_date", e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditAdmissionDialog(false)}
                disabled={editAdmissionMutation.isPending}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={editAdmissionMutation.isPending}>
                {editAdmissionMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Governorate Dialogs */}
      <LookupCreateDialog
        open={showGovernorateDialog}
        type="governorate"
        onOpenChange={setShowGovernorateDialog}
        onCreated={(item) => {
          editAdmissionForm.setValue("governorate_id", item.id);
        }}
      />

      <LookupManageDialog
        open={showGovernorateManage}
        type="governorate"
        onOpenChange={setShowGovernorateManage}
        items={governorates?.map((g) => ({ id: g.id, name: g.name })) || []}
      />

      {/* District Dialogs */}
      <LookupCreateDialog
        open={showDistrictDialog}
        type="district"
        onOpenChange={setShowDistrictDialog}
        context={{ governorate_id: editAdmissionForm.watch("governorate_id") }}
        onCreated={(item) => {
          editAdmissionForm.setValue("district_id", item.id);
        }}
      />

      <LookupManageDialog
        open={showDistrictManage}
        type="district"
        onOpenChange={setShowDistrictManage}
        items={districts?.map((d) => ({ id: d.id, name: d.name })) || []}
      />

      {/* Station Dialogs */}
      <LookupCreateDialog
        open={showStationDialog}
        type="station"
        onOpenChange={setShowStationDialog}
        onCreated={(item) => {
          editAdmissionForm.setValue("station_id", item.id);
        }}
      />

      <LookupManageDialog
        open={showStationManage}
        type="station"
        onOpenChange={setShowStationManage}
        items={stations?.map((s) => ({ id: s.id, name: s.name })) || []}
      />

      {/* Occupation Dialogs */}
      <LookupCreateDialog
        open={showOccupationDialog}
        type="occupation"
        onOpenChange={setShowOccupationDialog}
        onCreated={(item) => {
          editAdmissionForm.setValue("occupation_id", item.id);
        }}
      />

      <LookupManageDialog
        open={showOccupationManage}
        type="occupation"
        onOpenChange={setShowOccupationManage}
        items={occupations?.map((o) => ({ id: o.id, name: o.name })) || []}
      />
      </div>
    </Layout>
  );
}