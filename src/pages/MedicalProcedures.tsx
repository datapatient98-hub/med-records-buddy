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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Save, Search, Microscope, AlertTriangle, Syringe } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer } from "recharts";
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

type SparkTable = "endoscopies" | "emergencies" | "procedures";

function useSparkData(table: SparkTable, from: Date) {
  return useQuery({
    queryKey: ["spark", table, from.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("created_at")
        .gte("created_at", from.toISOString());
      if (error) throw error;

      const days = Array.from({ length: 7 }).map((_, idx) => {
        const d = subDays(new Date(), 6 - idx);
        const dayKey = format(d, "yyyy-MM-dd");
        const count = (data || []).filter((r: any) =>
          String(r.created_at || "").startsWith(dayKey)
        ).length;
        return { day: format(d, "dd/MM"), count };
      });

      return {
        total: (data || []).length,
        days,
      };
    },
  });
}

export default function MedicalProcedures() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ProcedureType>("endoscopy");
  const [searchNumber, setSearchNumber] = useState("");

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

  const sparkFrom = useMemo(() => subDays(new Date(), 6), []);
  const { data: endoscopySpark } = useSparkData("endoscopies", sparkFrom);
  const { data: emergencySpark } = useSparkData("emergencies", sparkFrom);
  const { data: procedureSpark } = useSparkData("procedures", sparkFrom);


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
        <div>
          <h2 className="text-3xl font-bold text-foreground">تسجيل الإجراءات الطبية</h2>
          <p className="text-muted-foreground">المناظير - الطوارئ - البذل</p>
        </div>

        <Card className="shadow-lg border-border">
          <CardHeader className="sticky top-28 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ProcedureType)}>
              <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-xl border border-border bg-muted/30 p-2 md:grid-cols-3">
                <TabsTrigger
                  value="endoscopy"
                  className="p-0 rounded-lg data-[state=active]:shadow-medical-lg data-[state=active]:ring-1 data-[state=active]:ring-ring"
                >
                  <div className="w-full rounded-lg bg-card p-4 text-right">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Microscope className="h-4 w-4" />
                          <span className="text-sm font-medium">المناظير</span>
                        </div>
                        <div className="mt-2 text-3xl font-bold">{endoscopySpark?.total ?? 0}</div>
                        <div className="mt-1 text-xs text-muted-foreground">آخر 7 أيام</div>
                      </div>
                      <div className="h-10 w-24">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={endoscopySpark?.days ?? []}>
                            <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </TabsTrigger>

                <TabsTrigger
                  value="emergency"
                  className="p-0 rounded-lg data-[state=active]:shadow-medical-lg data-[state=active]:ring-1 data-[state=active]:ring-ring"
                >
                  <div className="w-full rounded-lg bg-card p-4 text-right">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">الطوارئ</span>
                        </div>
                        <div className="mt-2 text-3xl font-bold">{emergencySpark?.total ?? 0}</div>
                        <div className="mt-1 text-xs text-muted-foreground">آخر 7 أيام</div>
                      </div>
                      <div className="h-10 w-24">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={emergencySpark?.days ?? []}>
                            <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </TabsTrigger>

                <TabsTrigger
                  value="procedure"
                  className="p-0 rounded-lg data-[state=active]:shadow-medical-lg data-[state=active]:ring-1 data-[state=active]:ring-ring"
                >
                  <div className="w-full rounded-lg bg-card p-4 text-right">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Syringe className="h-4 w-4" />
                          <span className="text-sm font-medium">البذل</span>
                        </div>
                        <div className="mt-2 text-3xl font-bold">{procedureSpark?.total ?? 0}</div>
                        <div className="mt-1 text-xs text-muted-foreground">آخر 7 أيام</div>
                      </div>
                      <div className="h-10 w-24">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={procedureSpark?.days ?? []}>
                            <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
          {/* Search Section */}
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${tabInfo.color}`} />
              {tabInfo.title}
            </CardTitle>
            <CardDescription>ابحث بالرقم الموحد لتحميل بيانات المريض</CardDescription>
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