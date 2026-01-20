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
import { Save, Search, Microscope, AlertTriangle, Syringe } from "lucide-react";
import { format, subDays } from "date-fns";

type ProcedureType = "endoscopy" | "emergency" | "procedure";

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
  department_id: z.string().min(1, "القسم مطلوب"),
  diagnosis_id: z.string().optional(),
  doctor_id: z.string().optional(),
  procedure_date: z.string().min(1, "تاريخ الإجراء مطلوب"),
});

type ProcedureFormValues = z.infer<typeof procedureSchema>;


export default function MedicalProcedures() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ProcedureType>("endoscopy");
  const [searchNumber, setSearchNumber] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("month");

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

  const { start, end } = getTimeRangeDates(timeRange);
  
  const { data: endoscopyCount } = useQuery({
    queryKey: ["endoscopies-count", timeRange],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("endoscopies")
        .select("id", { count: "exact", head: true })
        .gte("procedure_date", start.toISOString())
        .lte("procedure_date", end.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: emergencyCount } = useQuery({
    queryKey: ["emergencies-count", timeRange],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("emergencies")
        .select("id", { count: "exact", head: true })
        .gte("visit_date", start.toISOString())
        .lte("visit_date", end.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: procedureCount } = useQuery({
    queryKey: ["procedures-count", timeRange],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("procedures")
        .select("id", { count: "exact", head: true })
        .gte("procedure_date", start.toISOString())
        .lte("procedure_date", end.toISOString());
      if (error) throw error;
      return count ?? 0;
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
      return;
    }

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
      department_id: data.department_id,
      diagnosis_id: data.diagnosis_id || undefined,
      doctor_id: data.doctor_id || undefined,
      procedure_date: new Date().toISOString().slice(0, 16),
    });
  };

  const mutation = useMutation({
    mutationFn: async (values: ProcedureFormValues) => {
      const table = activeTab === "endoscopy" ? "endoscopies" : activeTab === "emergency" ? "emergencies" : "procedures";
      const dateField = activeTab === "endoscopy" ? "procedure_date" : activeTab === "emergency" ? "visit_date" : "procedure_date";

      const insertData: any = {
        unified_number: values.unified_number,
        patient_name: values.patient_name,
        national_id: values.national_id,
        gender: values.gender,
        marital_status: values.marital_status,
        phone: values.phone,
        age: Number(values.age),
        department_id: values.department_id,
        [dateField]: values.procedure_date,
        occupation_id: values.occupation_id || null,
        governorate_id: values.governorate_id || null,
        district_id: values.district_id || null,
        address_details: values.address_details || null,
        station_id: values.station_id || null,
        diagnosis_id: values.diagnosis_id || null,
        doctor_id: values.doctor_id || null,
      };

      const { data, error } = await supabase
        .from(table)
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [activeTab === "endoscopy" ? "endoscopies" : activeTab === "emergency" ? "emergencies" : "procedures"] });
      const typeLabel = activeTab === "endoscopy" ? "منظار" : activeTab === "emergency" ? "طوارئ" : "بذل";
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
      case "endoscopy":
        return { icon: Microscope, title: "تسجيل مناظير", color: "text-purple" };
      case "emergency":
        return { icon: AlertTriangle, title: "تسجيل طوارئ", color: "text-orange" };
      case "procedure":
        return { icon: Syringe, title: "تسجيل بذل", color: "text-green" };
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
            <p className="text-muted-foreground">المناظير - الطوارئ - البذل</p>
          </div>
          <TimeFilter value={timeRange} onChange={setTimeRange} />
        </div>

        {/* Colored Tabs */}
        <div className="sticky top-16 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4">
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            <ColoredStatTab
              title="المناظير"
              value={endoscopyCount ?? 0}
              subtitle={`خلال ${timeRange === "day" ? "اليوم" : timeRange === "week" ? "الأسبوع" : timeRange === "month" ? "الشهر" : "3 أشهر"}`}
              icon={Microscope}
              color="purple"
              onClick={() => setActiveTab("endoscopy")}
              active={activeTab === "endoscopy"}
            />
            <ColoredStatTab
              title="الطوارئ"
              value={emergencyCount ?? 0}
              subtitle={`خلال ${timeRange === "day" ? "اليوم" : timeRange === "week" ? "الأسبوع" : timeRange === "month" ? "الشهر" : "3 أشهر"}`}
              icon={AlertTriangle}
              color="orange"
              onClick={() => setActiveTab("emergency")}
              active={activeTab === "emergency"}
            />
            <ColoredStatTab
              title="البذل"
              value={procedureCount ?? 0}
              subtitle={`خلال ${timeRange === "day" ? "اليوم" : timeRange === "week" ? "الأسبوع" : timeRange === "month" ? "الشهر" : "3 أشهر"}`}
              icon={Syringe}
              color="green"
              onClick={() => setActiveTab("procedure")}
              active={activeTab === "procedure"}
            />
          </div>
        </div>

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
                      <FormLabel>القسم *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر القسم" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments?.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
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
                  name="diagnosis_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>التشخيص</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                  name="doctor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الطبيب</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
    </div>
    </Layout>
  );
}