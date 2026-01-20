import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import LookupCreateDialog, { type LookupCreateType } from "@/components/LookupCreateDialog";
import ColoredStatTab from "@/components/ColoredStatTab";
import TimeFilter, { type TimeRange, getTimeRangeDates } from "@/components/TimeFilter";
import AdmissionSuccessNotification from "@/components/AdmissionSuccessNotification";
import SearchableSelect from "@/components/SearchableSelect";
import TopLeftNotice from "@/components/TopLeftNotice";
import { getAgeFromEgyptNationalId } from "@/lib/egyptNationalId";
import { Activity, FileUp, LogOut, Save, UserPlus, Users } from "lucide-react";

const digitsOnly = (msg: string) => z.string().trim().regex(/^\d+$/, msg);

const admissionSchema = z.object({
  unified_number: digitsOnly("الرقم الموحد يجب أن يكون أرقام فقط").min(1, "الرقم الموحد مطلوب"),
  patient_name: z
    .string()
    .trim()
    .min(1, "اسم المريض مطلوب")
    .refine(
      (v) => v.split(/\s+/).filter(Boolean).length >= 4,
      "الاسم رباعي مطلوب"
    ),
  national_id: digitsOnly("الرقم القومي يجب أن يكون أرقام فقط")
    .length(14, "الرقم القومي يجب أن يكون 14 رقم"),
  gender: z.enum(["ذكر", "أنثى"]),
  occupation_id: z.string().optional(),
  marital_status: z.enum(["أعزب", "متزوج", "مطلق", "أرمل"]),
  phone: digitsOnly("رقم الهاتف يجب أن يكون أرقام فقط").length(
    11,
    "رقم الهاتف يجب أن يكون 11 رقم"
  ),
  age: z.coerce.number().min(0, "السن يجب أن يكون رقم موجب"),
  governorate_id: z.string().min(1, "المحافظة مطلوبة"),
  district_id: z.string().optional(),
  address_details: z.string().trim().max(500, "العنوان طويل جداً").optional(),
  station_id: z.string().optional(),
  department_id: z.string().min(1, "القسم/المركز مطلوب"),
  admission_status: z.enum(["محجوز", "خروج", "متوفى", "تحويل"]),
  diagnosis_id: z.string().optional(),
  doctor_id: z.string().optional(),
  admission_date: z.string().min(1, "تاريخ الحجز مطلوب"),
});

type AdmissionFormValues = z.infer<typeof admissionSchema>;

type InlineNoticeState =
  | null
  | {
      title: string;
      description?: string;
      variant: "success" | "error" | "info";
      durationMs?: number;
    };

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{children}</span>
      <span className="inline-flex items-center gap-1">
        <span className="text-destructive font-bold">*</span>
        <span className="text-destructive text-xs font-semibold">إلزامي</span>
      </span>
    </span>
  );
}

export default function Admission() {
  const queryClient = useQueryClient();
  const [showNewItemDialog, setShowNewItemDialog] = useState<LookupCreateType | null>(null);
  const [dialogContext, setDialogContext] = useState<{ governorate_id?: string } | undefined>(undefined);
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [selectedTab, setSelectedTab] = useState<
    "active" | "discharged" | "total" | "admissions"
  >("total");
  const [successNotification, setSuccessNotification] = useState<{
    unifiedNumber: string;
    patientName: string;
    departmentName: string;
  } | null>(null);
  const [notice, setNotice] = useState<InlineNoticeState>(null);

  const unifiedNumberRef = useRef<HTMLInputElement>(null);

  const form = useForm<AdmissionFormValues>({
    resolver: zodResolver(admissionSchema),
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

  const selectedGovernorateId = form.watch("governorate_id");
  const filteredDistricts = useMemo(() => {
    const all = districts ?? [];
    if (!selectedGovernorateId) return all;
    return all.filter((d: any) => d.governorate_id === selectedGovernorateId);
  }, [districts, selectedGovernorateId]);

  // Auto-calc age from national id
  const nationalId = form.watch("national_id");
  useEffect(() => {
    const age = getAgeFromEgyptNationalId(nationalId);
    if (age === null) return;
    form.setValue("age", age, { shouldValidate: true, shouldDirty: true });
  }, [form, nationalId]);

  // Top stats
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

  const fetchPatientByUnifiedNumber = async (unifiedNumber: string) => {
    if (!unifiedNumber) return;

    const { data, error } = await supabase
      .from("admissions")
      .select("*")
      .eq("unified_number", unifiedNumber)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching patient:", error);
      setNotice({
        title: "حدث خطأ أثناء البحث",
        description: "يرجى المحاولة مرة أخرى",
        variant: "error",
        durationMs: 5000,
      });
      return;
    }

    if (data) {
      form.setValue("patient_name", data.patient_name);
      form.setValue("national_id", data.national_id);
      form.setValue("gender", data.gender);
      form.setValue("age", data.age);
      form.setValue("phone", data.phone);
      form.setValue("marital_status", data.marital_status);
      if (data.governorate_id) form.setValue("governorate_id", data.governorate_id);
      if (data.district_id) form.setValue("district_id", data.district_id);
      if (data.address_details) form.setValue("address_details", data.address_details);
      if (data.occupation_id) form.setValue("occupation_id", data.occupation_id);
      if (data.station_id) form.setValue("station_id", data.station_id);

      setNotice({
        title: "تم العثور على بيانات سابقة",
        description: "تم تعبئة البيانات تلقائياً",
        variant: "info",
        durationMs: 5000,
      });
    } else {
      setNotice({
        title: "لا يوجد مريض بهذا الرقم",
        description: "هذا الرقم الموحد غير مسجل من قبل",
        variant: "error",
        durationMs: 5000,
      });
    }
  };

  const mutation = useMutation({
    mutationFn: async (values: AdmissionFormValues) => {
      const { data, error } = await supabase
        .from("admissions")
        .insert([
          {
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
          },
        ])
        .select("*, departments(name)")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admissions"] });

      setSuccessNotification({
        unifiedNumber: data.unified_number,
        patientName: data.patient_name,
        departmentName: data.departments?.name || "غير محدد",
      });

      form.reset({
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
      });

      window.setTimeout(() => unifiedNumberRef.current?.focus(), 50);
    },
    onError: (error: any) => {
      console.error(error);
      setNotice({
        title: "خطأ في الحفظ",
        description: "تعذر حفظ البيانات. تأكد من إدخال البيانات بشكل صحيح.",
        variant: "error",
        durationMs: 5000,
      });
    },
  });

  return (
    <Layout>
      <div className="space-y-6">
        {notice && (
          <TopLeftNotice
            title={notice.title}
            description={notice.description}
            variant={notice.variant}
            durationMs={notice.durationMs}
            onClose={() => setNotice(null)}
          />
        )}

        <div className="sticky top-16 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground">تسجيل دخول المريض</h2>
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
                timeRange === "day"
                  ? "اليوم"
                  : timeRange === "week"
                  ? "الأسبوع"
                  : timeRange === "month"
                  ? "الشهر"
                  : "3 أشهر"
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
              الحقول الإلزامية عليها علامة <span className="text-destructive font-bold">*</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
                className="space-y-6"
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="unified_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <RequiredLabel>الرقم الموحد</RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="أدخل الرقم الموحد"
                            {...field}
                            ref={unifiedNumberRef}
                            inputMode="numeric"
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, "");
                              field.onChange(v);
                            }}
                            onBlur={(e) => {
                              field.onBlur();
                              fetchPatientByUnifiedNumber(e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-muted-foreground">
                          يتم البحث عند الضغط على أي مربع آخر
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="patient_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <RequiredLabel>اسم المريض (رباعي)</RequiredLabel>
                        </FormLabel>
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
                        <FormLabel>
                          <RequiredLabel>الرقم القومي (14 رقم)</RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="12345678901234"
                            maxLength={14}
                            inputMode="numeric"
                            value={field.value}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, "").slice(0, 14);
                              field.onChange(v);
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                          />
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
                        <FormLabel>
                          <RequiredLabel>النوع</RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex gap-4"
                          >
                            <div className="flex items-center gap-2">
                              <Label htmlFor="gender-male" className="cursor-pointer">ذكر</Label>
                              <RadioGroupItem value="ذكر" id="gender-male" />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label htmlFor="gender-female" className="cursor-pointer">أنثى</Label>
                              <RadioGroupItem value="أنثى" id="gender-female" />
                            </div>
                          </RadioGroup>
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
                            options={occupations ?? []}
                            placeholder="اختر المهنة"
                            onAddNew={() => {
                              setDialogContext(undefined);
                              setShowNewItemDialog("occupation");
                            }}
                            addNewLabel="إضافة مهنة جديدة"
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
                        <FormLabel>
                          <RequiredLabel>الحالة الاجتماعية</RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-wrap gap-4"
                          >
                            <div className="flex items-center gap-2">
                              <Label htmlFor="marital-single" className="cursor-pointer">أعزب</Label>
                              <RadioGroupItem value="أعزب" id="marital-single" />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label htmlFor="marital-married" className="cursor-pointer">متزوج</Label>
                              <RadioGroupItem value="متزوج" id="marital-married" />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label htmlFor="marital-divorced" className="cursor-pointer">مطلق</Label>
                              <RadioGroupItem value="مطلق" id="marital-divorced" />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label htmlFor="marital-widowed" className="cursor-pointer">أرمل</Label>
                              <RadioGroupItem value="أرمل" id="marital-widowed" />
                            </div>
                          </RadioGroup>
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
                        <FormLabel>
                          <RequiredLabel>رقم الهاتف (11 رقم)</RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="01234567890"
                            maxLength={11}
                            inputMode="numeric"
                            value={field.value}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, "").slice(0, 11);
                              field.onChange(v);
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                          />
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
                        <FormLabel>
                          <RequiredLabel>السن</RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="السن"
                            value={field.value}
                            onChange={field.onChange}
                            disabled
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-muted-foreground">
                          يتم حساب السن تلقائياً من الرقم القومي
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="governorate_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <RequiredLabel>المحافظة</RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <SearchableSelect
                            value={field.value}
                            onValueChange={(v) => {
                              field.onChange(v);
                              // clear district when governorate changes
                              form.setValue("district_id", "");
                            }}
                            options={governorates ?? []}
                            placeholder="اختر المحافظة"
                            onAddNew={() => {
                              setDialogContext(undefined);
                              setShowNewItemDialog("governorate");
                            }}
                            addNewLabel="إضافة محافظة جديدة"
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
                        <FormLabel>المركز/الحي</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            value={field.value}
                            onValueChange={field.onChange}
                            options={filteredDistricts as any}
                            placeholder="اختر المركز/الحي"
                            onAddNew={() => {
                              setDialogContext({ governorate_id: selectedGovernorateId || undefined });
                              setShowNewItemDialog("district");
                            }}
                            addNewLabel="إضافة مركز/حي"
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
                      <FormItem>
                        <FormLabel>العنوان تفصيلي</FormLabel>
                        <FormControl>
                          <Input placeholder="تفاصيل العنوان" {...field} />
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
                        <FormLabel>المحطة اللي جاي منها</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            value={field.value}
                            onValueChange={field.onChange}
                            options={stations ?? []}
                            placeholder="اختر المحطة"
                            onAddNew={() => {
                              setDialogContext(undefined);
                              setShowNewItemDialog("station");
                            }}
                            addNewLabel="إضافة محطة جديدة"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="department_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <RequiredLabel>القسم أو المركز</RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <SearchableSelect
                            value={field.value}
                            onValueChange={field.onChange}
                            options={departments ?? []}
                            placeholder="اختر القسم/المركز"
                            onAddNew={() => {
                              setDialogContext(undefined);
                              setShowNewItemDialog("department");
                            }}
                            addNewLabel="إضافة قسم جديد"
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
                        <FormLabel>
                          <RequiredLabel>الحالة</RequiredLabel>
                        </FormLabel>
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
                            options={diagnoses ?? []}
                            placeholder="اختر التشخيص"
                            onAddNew={() => {
                              setDialogContext(undefined);
                              setShowNewItemDialog("diagnosis");
                            }}
                            addNewLabel="إضافة تشخيص جديد"
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
                            options={doctors ?? []}
                            placeholder="اختر الطبيب"
                            onAddNew={() => {
                              setDialogContext(undefined);
                              setShowNewItemDialog("doctor");
                            }}
                            addNewLabel="إضافة طبيب جديد"
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
                        <FormLabel>
                          <RequiredLabel>تاريخ وساعة الحجز</RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs text-muted-foreground">
                          AM صباحاً / PM مساءً
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormItem>
                    <FormLabel>تاريخ التعديل</FormLabel>
                    <FormControl>
                      <Input
                        disabled
                        value="يتم تسجيله تلقائياً عند التعديل"
                        readOnly
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground">
                      يظهر تاريخ آخر تعديل للسجل
                    </FormDescription>
                  </FormItem>
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
            context={dialogContext}
            onOpenChange={(open) => setShowNewItemDialog(open ? showNewItemDialog : null)}
          />
        )}

        {successNotification && (
          <AdmissionSuccessNotification
            unifiedNumber={successNotification.unifiedNumber}
            patientName={successNotification.patientName}
            departmentName={successNotification.departmentName}
            onClose={() => setSuccessNotification(null)}
          />
        )}
      </div>
    </Layout>
  );
}
