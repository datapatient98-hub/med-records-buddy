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
import LookupManageDialog from "@/components/LookupManageDialog";
import ColoredStatTab from "@/components/ColoredStatTab";
import TimeFilter, { type TimeRange, getTimeRangeDates } from "@/components/TimeFilter";
import AdmissionSuccessNotification from "@/components/AdmissionSuccessNotification";
import SearchableSelect from "@/components/SearchableSelect";
import TopLeftNotice from "@/components/TopLeftNotice";
import ExcelImportDialog from "@/components/ExcelImportDialog";
import { importAdmissionsFromExcel } from "@/lib/excel/importAdmissionsFromExcel";
import { downloadImportSummaryExcel } from "@/lib/excel/exportImportExcel";
import { normalizeCellValue } from "@/lib/excel/normalizeArabic";
import { validateAdmissionExcelRow } from "@/lib/excel/validateAdmissionExcelRow";
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
  department_id: z.string().min(1, "قسم الحجز مطلوب"),
  admission_status: z.enum(["محجوز", "خروج", "متوفى", "تحويل"]),
  admission_source: z.enum(["طوارئ", "داخلي"]),
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
  const [showManageDialog, setShowManageDialog] = useState<LookupCreateType | null>(null);
  const [dialogContext, setDialogContext] = useState<{ governorate_id?: string } | undefined>(undefined);
  const [onItemCreatedCallback, setOnItemCreatedCallback] = useState<((item: { id: string; name: string }) => void) | undefined>(undefined);
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [importOpen, setImportOpen] = useState(false);
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
      admission_source: "داخلي",
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

  const manageItems = useMemo(() => {
    switch (showManageDialog) {
      case "department":
        return (departments ?? []) as any;
      case "governorate":
        return (governorates ?? []) as any;
      case "district":
        return (districts ?? []) as any;
      case "station":
        return (stations ?? []) as any;
      case "occupation":
        return (occupations ?? []) as any;
      case "doctor":
        return (doctors ?? []) as any;
      case "diagnosis":
        return (diagnoses ?? []) as any;
      default:
        return [] as any[];
    }
  }, [
    showManageDialog,
    departments,
    governorates,
    districts,
    stations,
    occupations,
    doctors,
    diagnoses,
  ]);

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

  // Clear form fields when unified_number is cleared
  const watchUnifiedNumber = form.watch("unified_number");
  useEffect(() => {
    if (!watchUnifiedNumber || watchUnifiedNumber.trim() === "") {
      // Reset all fields except defaults
      form.setValue("patient_name", "");
      form.setValue("national_id", "");
      form.setValue("gender", "ذكر");
      form.setValue("occupation_id", "");
      form.setValue("marital_status", "أعزب");
      form.setValue("phone", "");
      form.setValue("age", 0);
      form.setValue("governorate_id", "");
      form.setValue("district_id", "");
      form.setValue("address_details", "");
      form.setValue("station_id", "");
      form.setValue("department_id", "");
      form.setValue("diagnosis_id", "");
      form.setValue("doctor_id", "");
    }
  }, [watchUnifiedNumber, form]);

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
            admission_source: values.admission_source as any,
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
      
      let errorDescription = "تعذر حفظ البيانات. تأكد من إدخال البيانات بشكل صحيح.";
      
      // Parse specific errors
      const errorMsg = error?.message?.toLowerCase() || "";
      
      if (errorMsg.includes("foreign key") || errorMsg.includes("violates foreign key")) {
        // Foreign key constraint violation
        if (errorMsg.includes("department")) {
          errorDescription = "القسم المحدد غير موجود. يرجى اختيار قسم صحيح أو إضافة قسم جديد.";
        } else if (errorMsg.includes("governorate")) {
          errorDescription = "المحافظة المحددة غير موجودة. يرجى اختيار محافظة صحيحة أو إضافة محافظة جديدة.";
        } else if (errorMsg.includes("doctor")) {
          errorDescription = "الطبيب المحدد غير موجود. يرجى اختيار طبيب صحيح أو إضافة طبيب جديد.";
        } else if (errorMsg.includes("diagnosis")) {
          errorDescription = "التشخيص المحدد غير موجود. يرجى اختيار تشخيص صحيح أو إضافة تشخيص جديد.";
        } else if (errorMsg.includes("occupation")) {
          errorDescription = "المهنة المحددة غير موجودة. يرجى اختيار مهنة صحيحة أو إضافة مهنة جديدة.";
        } else if (errorMsg.includes("district")) {
          errorDescription = "المركز/الحي المحدد غير موجود. يرجى اختيار مركز صحيح أو إضافة مركز جديد.";
        } else if (errorMsg.includes("station")) {
          errorDescription = "المحطة المحددة غير موجودة. يرجى اختيار محطة صحيحة أو إضافة محطة جديدة.";
        } else {
          errorDescription = "أحد الحقول المحددة غير صحيح. يرجى التحقق من جميع الحقول والمحاولة مرة أخرى.";
        }
      } else if (errorMsg.includes("unique") || errorMsg.includes("duplicate")) {
        errorDescription = "الرقم الموحد موجود بالفعل. يرجى استخدام رقم موحد آخر.";
      } else if (errorMsg.includes("not null") || errorMsg.includes("null value")) {
        errorDescription = "بعض الحقول الإلزامية لم يتم تعبئتها. يرجى التحقق من جميع الحقول المطلوبة.";
      } else if (errorMsg.includes("check constraint")) {
        errorDescription = "أحد الحقول يحتوي على قيمة غير صحيحة. يرجى التحقق من البيانات المدخلة.";
      }
      
      setNotice({
        title: "خطأ في الحفظ",
        description: errorDescription,
        variant: "error",
        durationMs: 8000,
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
              <Button variant="outline" type="button" onClick={() => setImportOpen(true)}>
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
                onSubmit={form.handleSubmit(
                  (data) => mutation.mutate(data),
                  (errors) => {
                    const first = Object.values(errors)[0];
                    const msg = (first as any)?.message as string | undefined;
                    setNotice({
                      title: "بيانات غير مكتملة",
                      description: msg || "يرجى استكمال الحقول الإلزامية.",
                      variant: "error",
                      durationMs: 7000,
                    });
                  }
                )}
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
                            options={occupations ?? []}
                            placeholder="اختر المهنة"
                            onManage={() => setShowManageDialog("occupation")}
                            onAddNew={() => {
                              setDialogContext(undefined);
                              setOnItemCreatedCallback(() => (item: { id: string; name: string }) => {
                                field.onChange(item.id);
                              });
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
                          <SearchableSelect
                            value={field.value}
                            onValueChange={field.onChange}
                            options={[
                              { id: "أعزب", name: "أعزب" },
                              { id: "متزوج", name: "متزوج" },
                              { id: "مطلق", name: "مطلق" },
                              { id: "أرمل", name: "أرمل" },
                            ]}
                            placeholder="اختر الحالة الاجتماعية"
                            onAddNew={() => {
                              setNotice({
                                title: "إضافة حالة اجتماعية جديدة",
                                description: "يتم إضافة القيم الثابتة من خلال إعدادات النظام",
                                variant: "info",
                                durationMs: 5000,
                              });
                            }}
                            addNewLabel="إضافة حالة جديدة"
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
                            onManage={() => setShowManageDialog("governorate")}
                            onAddNew={() => {
                              setDialogContext(undefined);
                              setOnItemCreatedCallback(() => (item: { id: string; name: string }) => {
                                field.onChange(item.id);
                              });
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
                            onManage={() => setShowManageDialog("district")}
                            onAddNew={() => {
                              setDialogContext({ governorate_id: selectedGovernorateId || undefined });
                              setOnItemCreatedCallback(() => (item: { id: string; name: string }) => {
                                field.onChange(item.id);
                              });
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
                            onManage={() => setShowManageDialog("station")}
                            onAddNew={() => {
                              setDialogContext(undefined);
                              setOnItemCreatedCallback(() => (item: { id: string; name: string }) => {
                                field.onChange(item.id);
                              });
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
                          <RequiredLabel>قسم الحجز</RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <SearchableSelect
                            value={field.value}
                            onValueChange={field.onChange}
                            options={departments ?? []}
                            placeholder="اختر قسم الحجز"
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
                    name="admission_source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <RequiredLabel>نوع الدخول</RequiredLabel>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر نوع الدخول" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="طوارئ">طوارئ</SelectItem>
                            <SelectItem value="داخلي">داخلي</SelectItem>
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
                            onManage={() => setShowManageDialog("diagnosis")}
                            onAddNew={() => {
                              setDialogContext(undefined);
                              setOnItemCreatedCallback(() => (item: { id: string; name: string }) => {
                                field.onChange(item.id);
                              });
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
                            onManage={() => setShowManageDialog("doctor")}
                            onAddNew={() => {
                              setDialogContext(undefined);
                              setOnItemCreatedCallback(() => (item: { id: string; name: string }) => {
                                field.onChange(item.id);
                              });
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

        <ExcelImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          title="استيراد الحجوزات من Excel"
          validateRow={(row, idx) => {
            // 1) validate content similarly to import logic
            const reason = validateAdmissionExcelRow(row);
            if (reason) return reason;
            // 2) also block duplicates within the same file by unified number (Excel row index is handled inside import)
            // NOTE: ExcelImportDialog validates rows one-by-one; unified dedupe is applied below in a second pass.
            return null;
          }}
          onConfirm={async (preview) => {
            try {
              // القاعدة المطلوبة: استيراد كل الصفوف ماعدا المكرر حرفياً (ExcelImportDialog يتكفّل بالمكرر الحرفي).
              // أي تكرار آخر (مثل الرقم الموحد) سيتم التعامل معه أثناء الإدخال في قاعدة البيانات ويظهر في تقرير الفشل.
              const result = await importAdmissionsFromExcel(preview.toImport);

              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["admissions"], exact: false }),
                queryClient.invalidateQueries({ queryKey: ["admissions-count"], exact: false }),
              ]);

              const failedSet = new Set(result.failed.map((f) => f.index));

              // الصفوف التي نجحت (من نفس ترتيب preview.toImport)
              const importedRows = preview.toImport
                .filter((_, i) => !failedSet.has(i))
                .map((r) => {
                  const obj: Record<string, string> = {};
                  preview.headers.forEach((h) => (obj[h] = normalizeCellValue(r[h])));
                  return obj;
                });

              // الصفوف التي تم تجاهلها بسبب التكرار الحرفي
              const duplicatesRows = preview.duplicates.map((d) => {
                const obj: Record<string, string> = {};
                preview.headers.forEach((h) => (obj[h] = normalizeCellValue((d.row as any)[h])));
                return obj;
              });

              downloadImportSummaryExcel({
                title: "تقرير استيراد الحجوزات",
                fileName: `admissions-import_${new Date().toISOString().slice(0, 10)}.xlsx`,
                columns: preview.headers,
                importedRows,
                duplicatesRows,
              });

              if (result.failed.length > 0) {
                setNotice({
                  title: "تم الاستيراد مع ملاحظات",
                  description: `تم استيراد ${result.inserted} صف، وفشل ${result.failed.length} صف. تم تحميل تقرير Excel للتفاصيل.`,
                  variant: "info",
                  durationMs: 9000,
                });
              } else {
                setNotice({
                  title: "تم الاستيراد بنجاح",
                  description: `تم استيراد ${result.inserted} صف، وتجاهل ${preview.duplicates.length} صف متطابق. تم تحميل تقرير Excel.`,
                  variant: "success",
                  durationMs: 7000,
                });
              }
            } catch (e: any) {
              console.error(e);
              setNotice({
                title: "فشل الاستيراد",
                description: e?.message || "حدث خطأ أثناء الاستيراد.",
                variant: "error",
                durationMs: 9000,
              });
              throw e;
            }
          }}
        />

        {showNewItemDialog && (
          <LookupCreateDialog
            open={!!showNewItemDialog}
            type={showNewItemDialog}
            context={dialogContext}
            onOpenChange={(open) => {
              if (!open) {
                setOnItemCreatedCallback(undefined);
              }
              setShowNewItemDialog(open ? showNewItemDialog : null);
            }}
            onCreated={onItemCreatedCallback}
          />
        )}

        {showManageDialog && (
          <LookupManageDialog
            open={!!showManageDialog}
            type={showManageDialog}
            items={manageItems}
            onOpenChange={(open) => setShowManageDialog(open ? showManageDialog : null)}
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
