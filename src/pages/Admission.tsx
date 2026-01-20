import { useState } from "react";
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
import LookupCreateDialog, { type LookupCreateType } from "@/components/LookupCreateDialog";
import ColoredStatTab from "@/components/ColoredStatTab";
import TimeFilter, { type TimeRange, getTimeRangeDates } from "@/components/TimeFilter";
import { Plus, Save, FileUp, UserPlus, Users, LogOut, Activity } from "lucide-react";

const admissionSchema = z.object({
  unified_number: z.string().min(1, "الرقم الموحد مطلوب"),
  patient_name: z.string().min(4, "الاسم رباعي مطلوب"),
  national_id: z.string().length(14, "الرقم القومي يجب أن يكون 14 رقم"),
  gender: z.enum(["ذكر", "أنثى"]),
  occupation_id: z.string().optional(),
  marital_status: z.enum(["أعزب", "متزوج", "مطلق", "أرمل"]),
  phone: z.string().length(11, "رقم الهاتف يجب أن يكون 11 رقم"),
  age: z.coerce.number().min(0, "السن يجب أن يكون رقم موجب"),
  governorate_id: z.string().min(1, "المحافظة مطلوبة"),
  district_id: z.string().optional(),
  address_details: z.string().optional(),
  station_id: z.string().optional(),
  department_id: z.string().min(1, "القسم مطلوب"),
  admission_status: z.enum(["محجوز", "خروج", "متوفى", "تحويل"]),
  diagnosis_id: z.string().optional(),
  doctor_id: z.string().optional(),
  admission_date: z.string().min(1, "تاريخ الحجز مطلوب"),
});

type AdmissionFormValues = z.infer<typeof admissionSchema>;

export default function Admission() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNewItemDialog, setShowNewItemDialog] = useState<LookupCreateType | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [selectedTab, setSelectedTab] = useState<"active" | "discharged" | "total" | "admissions">("total");

  const form = useForm<AdmissionFormValues>({
    resolver: zodResolver(admissionSchema),
    defaultValues: {
      admission_status: "محجوز",
      admission_date: new Date().toISOString().slice(0, 16),
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

  const { data: governorates } = useQuery({
    queryKey: ["governorates"],
    queryFn: async () => {
      const { data } = await supabase.from("governorates").select("*").order("name");
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

  // Top stats with time filter
  const { start, end } = getTimeRangeDates(timeRange);
  
  const { data: activeCount } = useQuery({
    queryKey: ["admissions-count", "active"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("admissions")
        .select("id", { count: "exact", head: true })
        .eq("admission_status", "محجوز");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: dischargedCount } = useQuery({
    queryKey: ["admissions-count", "discharged"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("admissions")
        .select("id", { count: "exact", head: true })
        .eq("admission_status", "خروج");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: totalCount } = useQuery({
    queryKey: ["admissions-count", "total"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("admissions")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: newAdmissionsCount } = useQuery({
    queryKey: ["admissions-count", "new", timeRange],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("admissions")
        .select("id", { count: "exact", head: true })
        .gte("admission_date", start.toISOString())
        .lte("admission_date", end.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: AdmissionFormValues) => {
      const { data, error } = await supabase
        .from("admissions")
        .insert([{
          unified_number: values.unified_number,
          patient_name: values.patient_name,
          national_id: values.national_id,
          gender: values.gender as any,
          occupation_id: values.occupation_id || null,
          marital_status: values.marital_status as any,
          phone: values.phone,
          age: Number(values.age),
          governorate_id: values.governorate_id || null,
          district_id: values.district_id || null,
          address_details: values.address_details || null,
          station_id: values.station_id || null,
          department_id: values.department_id,
          admission_status: values.admission_status as any,
          diagnosis_id: values.diagnosis_id || null,
          doctor_id: values.doctor_id || null,
          admission_date: values.admission_date,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      toast({
        title: "تم الحفظ بنجاح",
        description: `تم حفظ المريض ${data.patient_name} برقم موحد ${data.unified_number} في قسم ${data.department_id}`,
      });
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

  const onSubmit = (data: AdmissionFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">تسجيل دخول مريض</h2>
            <p className="text-muted-foreground">إضافة حالة جديدة للنظام</p>
          </div>
          <div className="flex gap-2">
            <TimeFilter value={timeRange} onChange={setTimeRange} />
            <Button variant="outline">
              <FileUp className="ml-2 h-4 w-4" />
              استيراد من Excel
            </Button>
          </div>
        </div>

        {/* Colored Tabs */}
        <div className="sticky top-16 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <ColoredStatTab
              title="الحالات المحجوزة"
              value={activeCount ?? 0}
              icon={Users}
              color="cyan"
              onClick={() => setSelectedTab("active")}
              active={selectedTab === "active"}
            />
            <ColoredStatTab
              title="حالات الخروج"
              value={dischargedCount ?? 0}
              icon={LogOut}
              color="pink"
              onClick={() => setSelectedTab("discharged")}
              active={selectedTab === "discharged"}
            />
            <ColoredStatTab
              title="إجمالي الحالات"
              value={totalCount ?? 0}
              icon={Activity}
              color="green"
              onClick={() => setSelectedTab("total")}
              active={selectedTab === "total"}
            />
            <ColoredStatTab
              title="عدد الدخول"
              value={newAdmissionsCount ?? 0}
              subtitle={`خلال ${
                timeRange === "day" ? "اليوم" : 
                timeRange === "week" ? "الأسبوع" : 
                timeRange === "month" ? "الشهر" : 
                "3 أشهر"
              }`}
              icon={UserPlus}
              color="purple"
              onClick={() => setSelectedTab("admissions")}
              active={selectedTab === "admissions"}
            />
          </div>
        </div>

        <Card className="shadow-medical">
          <CardHeader>
            <CardTitle>بيانات المريض</CardTitle>
            <CardDescription>
              يرجى ملء جميع البيانات المطلوبة بدقة. الحقول المميزة بـ * إلزامية
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                    name="governorate_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المحافظة *</FormLabel>
                        <div className="flex gap-2">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="اختر المحافظة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[200px]">
                              <div className="px-2 pb-2 sticky top-0 bg-popover z-10">
                                <Input
                                  placeholder="بحث..."
                                  className="h-8"
                                  onChange={(e) => {
                                    const search = e.target.value.toLowerCase();
                                    const items = document.querySelectorAll('[role="option"]');
                                    items.forEach((item) => {
                                      const text = item.textContent?.toLowerCase() || "";
                                      (item as HTMLElement).style.display = text.includes(search) ? "" : "none";
                                    });
                                  }}
                                />
                              </div>
                              {governorates?.map((gov) => (
                                <SelectItem key={gov.id} value={gov.id}>
                                  {gov.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => setShowNewItemDialog("governorate")}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="department_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>القسم *</FormLabel>
                        <div className="flex gap-2">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="اختر القسم" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[200px]">
                              <div className="px-2 pb-2 sticky top-0 bg-popover z-10">
                                <Input
                                  placeholder="بحث..."
                                  className="h-8"
                                  onChange={(e) => {
                                    const search = e.target.value.toLowerCase();
                                    const items = document.querySelectorAll('[role="option"]');
                                    items.forEach((item) => {
                                      const text = item.textContent?.toLowerCase() || "";
                                      (item as HTMLElement).style.display = text.includes(search) ? "" : "none";
                                    });
                                  }}
                                />
                              </div>
                              {departments?.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => setShowNewItemDialog("department")}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
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
                        <div className="flex gap-2">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="اختر التشخيص" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[200px]">
                              <div className="px-2 pb-2 sticky top-0 bg-popover z-10">
                                <Input
                                  placeholder="بحث..."
                                  className="h-8"
                                  onChange={(e) => {
                                    const search = e.target.value.toLowerCase();
                                    const items = document.querySelectorAll('[role="option"]');
                                    items.forEach((item) => {
                                      const text = item.textContent?.toLowerCase() || "";
                                      (item as HTMLElement).style.display = text.includes(search) ? "" : "none";
                                    });
                                  }}
                                />
                              </div>
                              {diagnoses?.map((diag) => (
                                <SelectItem key={diag.id} value={diag.id}>
                                  {diag.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => setShowNewItemDialog("diagnosis")}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
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
                        <div className="flex gap-2">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="اختر الطبيب" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[200px]">
                              <div className="px-2 pb-2 sticky top-0 bg-popover z-10">
                                <Input
                                  placeholder="بحث..."
                                  className="h-8"
                                  onChange={(e) => {
                                    const search = e.target.value.toLowerCase();
                                    const items = document.querySelectorAll('[role="option"]');
                                    items.forEach((item) => {
                                      const text = item.textContent?.toLowerCase() || "";
                                      (item as HTMLElement).style.display = text.includes(search) ? "" : "none";
                                    });
                                  }}
                                />
                              </div>
                              {doctors?.map((doc) => (
                                <SelectItem key={doc.id} value={doc.id}>
                                  {doc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => setShowNewItemDialog("doctor")}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="admission_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاريخ وساعة الحجز *</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
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
                        <FormLabel>حالة الدخول *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الحالة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="محجوز">محجوز</SelectItem>
                            <SelectItem value="خروج">خروج</SelectItem>
                            <SelectItem value="متوفى">متوفى</SelectItem>
                            <SelectItem value="تحويل">تحويل</SelectItem>
                          </SelectContent>
                        </Select>
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
                    <Save className="ml-2 h-4 w-4" />
                    {mutation.isPending ? "جاري الحفظ..." : "حفظ البيانات"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {showNewItemDialog && (
          <LookupCreateDialog
            open={!!showNewItemDialog}
            type={showNewItemDialog}
            onOpenChange={(open) => setShowNewItemDialog(open ? showNewItemDialog : null)}
          />
        )}
      </div>
    </Layout>
  );
}