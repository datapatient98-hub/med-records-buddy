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
import SearchableSelect from "@/components/SearchableSelect";
import LookupCreateDialog from "@/components/LookupCreateDialog";
import LookupManageDialog from "@/components/LookupManageDialog";

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

  const form = useForm<DischargeFormValues>({
    resolver: zodResolver(dischargeSchema),
    defaultValues: {
      discharge_date: new Date().toISOString().slice(0, 16),
      discharge_status: "تحسن",
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

    const { data, error } = await supabase
      .from("admissions")
      .select("*, departments(name), doctors(name), diagnoses(name), governorates(name)")
      .eq("unified_number", unifiedNumber)
      .eq("admission_status", "محجوز")
      .single();

    if (error || !data) {
      toast({
        title: "لم يتم العثور على المريض",
        description: "تأكد من الرقم الموحد أو أن المريض مازال محجوزاً",
        variant: "destructive",
      });
      return;
    }

    setSelectedAdmission(data);
    setShowDischargeForm(false);
    // Set default discharge department to admission department
    form.setValue("discharge_department_id", data.department_id);
  };

  const mutation = useMutation({
    mutationFn: async (values: DischargeFormValues) => {
      if (!selectedAdmission) return;

      // Insert discharge record
      const { error: dischargeError } = await supabase
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
        }]);

      if (dischargeError) throw dischargeError;

      // Update admission status
      const { error: updateError } = await supabase
        .from("admissions")
        .update({ admission_status: "خروج" as any })
        .eq("id", selectedAdmission.id);

      if (updateError) throw updateError;

      return selectedAdmission;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      queryClient.invalidateQueries({ queryKey: ["discharges"] });
      toast({
        title: "تم الحفظ بنجاح",
        description: `تم تسجيل خروج المريض ${data.patient_name} برقم داخلي ${data.internal_number}`,
      });
      // Reset form
      setSelectedAdmission(null);
      setUnifiedNumber("");
      setShowDischargeForm(false);
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
    // TODO: Implement edit functionality - for now just show a message
    toast({
      title: "تعديل بيانات الدخول",
      description: "يمكنك الآن تعديل بيانات الدخول من صفحة الحجز",
    });
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
                <p className="text-xs text-muted-foreground">الرقم الداخلي</p>
                <p className="font-semibold">{selectedAdmission.internal_number}</p>
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
                <p className="text-xs text-muted-foreground">النوع</p>
                <p className="font-semibold">{selectedAdmission.gender}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">السن</p>
                <p className="font-semibold">{selectedAdmission.age}</p>
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
                        <FormLabel>قسم الخروج (قسم الحجز)</FormLabel>
                          <FormControl>
                            <Input 
                              value={selectedAdmission?.departments?.name || "-"} 
                              disabled 
                              className="bg-secondary/50"
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر التشخيص" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {diagnoses?.map((diag) => (
                              <SelectItem key={diag.id} value={diag.id}>
                                {diag.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الطبيب" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {doctors?.map((doc) => (
                              <SelectItem key={doc.id} value={doc.id}>
                                {doc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                    {mutation.isPending ? "جاري الحفظ..." : "حفظ بيانات الخروج"}
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
      </div>
    </Layout>
  );
}