import { useEffect, useMemo, useState } from "react";
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
import { toast as sonnerToast } from "@/components/ui/sonner";
import { useNavigate } from "react-router-dom";
 import ColoredStatTab from "@/components/ColoredStatTab";
 import TimeFilter, { type TimeRange, getTimeRangeDates } from "@/components/TimeFilter";
 import { Save, Search, Syringe, UserCheck, Activity, Edit, Eye } from "lucide-react";
 import SearchableSelect from "@/components/SearchableSelect";
 import LookupCreateDialog, { type LookupCreateType } from "@/components/LookupCreateDialog";
 import LookupManageDialog from "@/components/LookupManageDialog";
 import { Database } from "@/integrations/supabase/types";
 import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EndoscopyForm, { type EndoscopyFormValues } from "@/components/MedicalProcedures/EndoscopyForm";
import { useFieldConfig } from "@/components/FieldConfigProvider";
import { getAuditActorLabel } from "@/lib/auditActor";
import OldFileNotice from "@/components/OldFileNotice";
import PreSaveReviewDialog from "@/components/PreSaveReviewDialog";
 
  type ProcedureType = "procedure" | "reception" | "kidney" | "endoscopy";
 
const procedureSchema = z.object({
  procedure_date: z.string().optional().or(z.literal("")),
  diagnosis_id: z.string().optional().or(z.literal("")),
  doctor_id: z.string().optional().or(z.literal("")),
  discharge_department_id: z.string().optional().or(z.literal("")),
  procedure_status: z.string().optional().or(z.literal("")),
  hospital_id: z.string().optional().or(z.literal("")),
  transferred_from_department_id: z.string().optional().or(z.literal("")),
});
 
 type ProcedureFormValues = z.infer<typeof procedureSchema>;
 type AdmissionData = Database["public"]["Tables"]["admissions"]["Row"];
type ProcedureData = Database["public"]["Tables"]["procedures"]["Row"];
 
 export default function MedicalProcedures() {
  const { getRule } = useFieldConfig();
  const navigate = useNavigate();
   const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<ProcedureType>("procedure");
   const [searchNumber, setSearchNumber] = useState("");
   const [timeRange, setTimeRange] = useState<TimeRange>("month");
   const [selectedAdmission, setSelectedAdmission] = useState<AdmissionData | null>(null);
    const [endoscopyNewMode, setEndoscopyNewMode] = useState(false);
   const [showEditAdmissionDialog, setShowEditAdmissionDialog] = useState(false);
   const [reviewOpen, setReviewOpen] = useState(false);
   const [pendingSubmit, setPendingSubmit] = useState<ProcedureFormValues | null>(null);
   const [endoReviewOpen, setEndoReviewOpen] = useState(false);
   const [pendingEndo, setPendingEndo] = useState<EndoscopyFormValues | null>(null);
   
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
   const [showExitStatusDialog, setShowExitStatusDialog] = useState(false);
   const [showExitStatusManage, setShowExitStatusManage] = useState(false);
 
   const form = useForm<ProcedureFormValues>({
     resolver: zodResolver(procedureSchema),
     defaultValues: {
       procedure_date: new Date().toISOString().slice(0, 16),
      discharge_department_id: "",
      procedure_status: "",
      hospital_id: "",
      transferred_from_department_id: "",
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

  const showField = (key: keyof ProcedureFormValues) => getRule("procedures", String(key)).visible;
  const isRequired = (key: keyof ProcedureFormValues) => getRule("procedures", String(key)).required;

  const validateRequired = (values: ProcedureFormValues) => {
    const requiredKeys: Array<keyof ProcedureFormValues> = ["procedure_date"];
    const isFilled = (v: unknown) => (typeof v === "string" ? v.trim().length > 0 : v != null);
    for (const k of requiredKeys) {
      if (!isRequired(k)) continue;
      if (!showField(k)) continue;
      const v = (values as any)[k];
      if (!isFilled(v)) return k;
    }
    return null;
  };

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

  const { data: exitStatuses } = useQuery({
    queryKey: ["exit_statuses"],
    queryFn: async () => {
      const { data } = await supabase.from("exit_statuses").select("*").order("name");
      return data || [];
    },
  });
 
  const getDepartmentsByName = (names: string[]) => {
    const list = departments ?? [];
    return list.filter((d) => names.includes(d.name));
  };

  const findDepartmentIdByName = (names: string[]) => {
    const match = (departments ?? []).find((d) => names.includes(d.name));
    return match?.id;
  };

  const findStationIdByName = (names: string[]) => {
    const match = (stations ?? []).find((s: any) => names.includes(s.name));
    return match?.id as string | undefined;
  };

  const dischargeDepartments = useMemo(() => {
    // قسم الخروج حسب التبويب
    if (!departments) return [];

    if (activeTab === "kidney") return getDepartmentsByName(["الغسيل الكلوي", "غسيل كلوي"]);
    if (activeTab === "reception") return getDepartmentsByName(["الاستقبال", "استقبال"]);
    if (activeTab === "endoscopy") return getDepartmentsByName(["المناظير", "مناظير"]);

    // procedure (البذل)
    return getDepartmentsByName(["بذل حريم بطن", "رجال بذل بطن", "بذل رجال بطن"]);
  }, [activeTab, departments]);

  const endoscopyDepartments = useMemo(() => {
    if (!departments) return [];
    return getDepartmentsByName(["المناظير", "مناظير"]);
  }, [departments]);

  // Status options for procedures (تحسن + قائمة أخرى قابلة للإدارة)
  const statusOptions = useMemo(() => {
    const list = (exitStatuses ?? []).map((s: any) => ({ id: s.name as string, name: s.name as string }));
    const hasTahason = list.some((x) => x.id === "تحسن");
    const normalized = hasTahason ? list : [{ id: "تحسن", name: "تحسن" }, ...list];
    const tahason = normalized.filter((x) => x.id === "تحسن");
    const others = normalized.filter((x) => x.id !== "تحسن");
    return [...tahason, ...others];
  }, [exitStatuses]);

   const { start, end } = getTimeRangeDates(timeRange);
 
    // Get counts for each procedure type
   const { data: procedureCounts } = useQuery({
     queryKey: ["procedures-counts", timeRange],
     queryFn: async () => {
        const baseTypes = ["procedure", "reception", "kidney"] as const;
        const typeMap = {
          procedure: "بذل",
          reception: "استقبال",
          kidney: "كلي",
        } as const;

        const baseCounts = await Promise.all(
          baseTypes.map(async (type) => {
            const { count, error } = await supabase
              .from("procedures")
              .select("id", { count: "exact", head: true })
              .eq("procedure_type", typeMap[type] as Database["public"]["Enums"]["procedure_type"])
              .gte("procedure_date", start.toISOString())
              .lte("procedure_date", end.toISOString());
            if (error) throw error;
            return { type, count: count ?? 0 };
          })
        );

        const { count: endoscopyCount, error: endoscopyError } = await supabase
          .from("endoscopies")
          .select("id", { count: "exact", head: true })
          .gte("procedure_date", start.toISOString())
          .lte("procedure_date", end.toISOString());
        if (endoscopyError) throw endoscopyError;

        return {
          ...Object.fromEntries(baseCounts.map((c) => [c.type, c.count])),
          endoscopy: endoscopyCount ?? 0,
        } as Record<ProcedureType, number>;
     },
   });

   // Get detailed status counts for each procedure type (endoscopy has no status breakdown here)
   const { data: statusCounts } = useQuery({
    queryKey: ["procedures-status-counts", timeRange],
    queryFn: async () => {
       const types: Array<Exclude<ProcedureType, "endoscopy">> = ["procedure", "reception", "kidney"];
       const typeMap: Record<Exclude<ProcedureType, "endoscopy">, string> = {
        procedure: "بذل",
        reception: "استقبال",
         kidney: "كلي",
      };
      
      const allCounts: Record<string, any> = {};
      
       for (const type of types) {
         const { count: improvedCount, error: improvedError } = await supabase
           .from("procedures")
           .select("id", { count: "exact", head: true })
           .eq("procedure_type", typeMap[type] as Database["public"]["Enums"]["procedure_type"])
           .eq("procedure_status", "تحسن")
           .gte("procedure_date", start.toISOString())
           .lte("procedure_date", end.toISOString());
         if (improvedError) throw improvedError;

         const { count: otherCount, error: otherError } = await supabase
           .from("procedures")
           .select("id", { count: "exact", head: true })
           .eq("procedure_type", typeMap[type] as Database["public"]["Enums"]["procedure_type"])
           .not("procedure_status", "is", null)
           .neq("procedure_status", "تحسن")
           .gte("procedure_date", start.toISOString())
           .lte("procedure_date", end.toISOString());
         if (otherError) throw otherError;

         allCounts[type] = {
           تحسن: improvedCount ?? 0,
           أخرى: otherCount ?? 0,
         };
      }
      
      return allCounts;
    },
  });
 
     const handleSearch = async () => {
     if (!searchNumber.trim()) {
      sonnerToast.error("الرجاء إدخال الرقم الموحد", {
        description: "يجب إدخال الرقم الموحد للبحث عن المريض",
         duration: 5000,
      });
       return;
     }
 
     const { data, error } = await supabase
       .from("admissions")
       .select("*")
       .eq("unified_number", searchNumber)
       .maybeSingle();
 
      if (error || !data) {
        // For endoscopy: allow registering from scratch even if the unified number isn't in admissions.
        if (activeTab === "endoscopy") {
          setSelectedAdmission(null);
          setEndoscopyNewMode(true);
          sonnerToast.message("⚠️ الرقم غير مسجل بدخول - تسجيل مناظير جديد", {
            description: "اكمل بيانات المريض ثم احفظ",
            duration: 5000,
          });
          return;
        }

         sonnerToast.error("لم يتم العثور على المريض", {
           description: "تأكد من الرقم الموحد",
           duration: 5000,
         });
        setSelectedAdmission(null);
        return;
      }
 
     setSelectedAdmission(data);
      setEndoscopyNewMode(false);
     form.setValue("diagnosis_id", data.diagnosis_id || "");
     form.setValue("doctor_id", data.doctor_id || "");
     form.setValue("procedure_date", new Date().toISOString().slice(0, 16));
    form.setValue("discharge_department_id", "");
    form.setValue("procedure_status", "");
    form.setValue("hospital_id", "");
    form.setValue("transferred_from_department_id", "");

      // تعيين قسم الخروج افتراضياً حسب التبويب
      if (activeTab === "kidney") {
        const id = findDepartmentIdByName(["الغسيل الكلوي", "غسيل كلوي"]);
        if (id) form.setValue("discharge_department_id", id);
      } else if (activeTab === "reception") {
        const id = findDepartmentIdByName(["الاستقبال", "استقبال"]);
        if (id) form.setValue("discharge_department_id", id);
      }
    
    sonnerToast.success("✓ تم تحميل بيانات المريض بنجاح", {
      description: `${data.patient_name} - ${data.unified_number}`,
      duration: 5000,
    });
   };

    const showSuccessNotification = (payload: {
      patient_name: string;
      unified_number: string;
      internal_number: number;
      label: string;
      created_at?: string | null;
    }) => {
      playSuccessSound();
        sonnerToast.custom(
          (id) => (
            <div
              dir="rtl"
              className="cursor-pointer space-y-3 text-right"
              onClick={() => sonnerToast.dismiss(id)}
              role="button"
              tabIndex={0}
            >
              <div className="space-y-1">
                <div className="text-base font-bold">✅ تم الحفظ بنجاح</div>
                <div className="text-sm text-muted-foreground">تم تسجيل {payload.label} بنجاح</div>
              </div>

              <div className="rounded-lg border bg-card/50 p-4">
                <div className="flex items-center justify-between gap-3 pb-2 border-b">
                  <span className="text-xs font-semibold text-muted-foreground">اسم المريض</span>
                  <span className="font-bold truncate max-w-[220px]">{payload.patient_name}</span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 border-b">
                  <span className="text-xs font-semibold text-muted-foreground">الرقم الموحد</span>
                  <span className="font-bold tabular-nums" dir="ltr">
                    {payload.unified_number}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 pt-2">
                  <span className="text-xs font-semibold text-muted-foreground">الرقم الداخلي</span>
                  <span className="text-lg font-black tabular-nums" dir="ltr">
                    🔢 {payload.internal_number}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 mt-2 border-t">
                  <span className="text-xs font-semibold text-muted-foreground">تاريخ ووقت التسجيل</span>
                  <span className="text-sm font-bold tabular-nums" dir="ltr">
                    {payload.created_at ? new Date(payload.created_at).toLocaleString("ar-EG") : "-"}
                  </span>
                </div>
              </div>

              <Button type="button" className="w-full" onClick={() => navigate("/records")}>
                📂 فتح صفحة السجلات
              </Button>
            </div>
          ),
          {
            duration: 5000,
            className: "w-[380px]",
          }
        );
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
            last_updated_by: getAuditActorLabel() || null,
         })
         .eq("id", selectedAdmission.id);
 
       if (error) throw error;
       return selectedAdmission.unified_number;
     },
     onSuccess: async (unifiedNumber) => {
       queryClient.invalidateQueries({ queryKey: ["admissions"] });
      sonnerToast.success("تم التحديث بنجاح", {
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
      sonnerToast.error("خطأ في التحديث", {
        description: error.message || "حدث خطأ أثناء تحديث بيانات الدخول",
        duration: 8000,
      });
     },
   });
 
  // Success sound effect (simple beep)
   const playSuccessSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // High-pitched beep
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

    const mutation = useMutation({
     mutationFn: async (values: ProcedureFormValues) => {
       if (!selectedAdmission) throw new Error("لم يتم اختيار مريض");
 
        const typeMap: Record<Exclude<ProcedureType, "endoscopy">, string> = {
         procedure: "بذل",
         reception: "استقبال",
          kidney: "كلي",
       };
 
         const safeTab = activeTab as Exclude<ProcedureType, "endoscopy">;
 
       const insertData: any = {
         admission_id: selectedAdmission.id,
         unified_number: selectedAdmission.unified_number,
         patient_name: selectedAdmission.patient_name,
         national_id: selectedAdmission.national_id,
         gender: selectedAdmission.gender,
         marital_status: selectedAdmission.marital_status,
         phone: selectedAdmission.phone,
         age: selectedAdmission.age,
          // قسم الدخول = بيانات الدخول التي تم تحميلها
          department_id: selectedAdmission.department_id,
         procedure_date: values.procedure_date,
          procedure_type: typeMap[safeTab],
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
        transferred_from_department_id: values.transferred_from_department_id || null,
        internal_number: selectedAdmission.internal_number || undefined, // Use existing or let DB generate
       };
 
       const { data, error } = await supabase
         .from("procedures")
         .insert([insertData])
         .select()
         .single();
 
       if (error) throw error;

        // Update admission's internal_number if it was just generated
        if (!selectedAdmission.internal_number && data.internal_number) {
          await supabase
            .from("admissions")
            .update({ internal_number: data.internal_number })
            .eq("id", selectedAdmission.id);
        }

       return data;
     },
     onSuccess: (data) => {
       queryClient.invalidateQueries({ queryKey: ["procedures"] });
       queryClient.invalidateQueries({ queryKey: ["procedures-counts"] });
      queryClient.invalidateQueries({ queryKey: ["procedures-status-counts"] });
        const typeLabel = activeTab === "procedure" ? "بذل" : activeTab === "reception" ? "استقبال" : "كلي";

        showSuccessNotification({
          patient_name: data.patient_name,
          unified_number: data.unified_number,
          internal_number: data.internal_number,
          label: typeLabel,
          created_at: (data as any).created_at ?? null,
        });
      
      // Reset form and clear selection
      setSelectedAdmission(null);
      setSearchNumber("");
      form.reset({
        procedure_date: new Date().toISOString().slice(0, 16),
        discharge_department_id: "",
        procedure_status: "",
        hospital_id: "",
        transferred_from_department_id: "",
      });
     },
     onError: (error: any) => {
      sonnerToast.error("خطأ في الحفظ", {
        description: error.message || "حدث خطأ أثناء محاولة حفظ الإجراء",
        duration: 8000,
      });
     },
   });

    const endoscopyMutation = useMutation({
      mutationFn: async (values: EndoscopyFormValues) => {
        if (!searchNumber.trim()) throw new Error("الرقم الموحد مطلوب");

        // NOTE: نستخدم any لتفادي تعارض types قبل تحديثها تلقائياً بعد ترقية الجدول
        const insertData: any = {
          admission_id: selectedAdmission?.id ?? null,
          unified_number: searchNumber.trim(),

          // بيانات المريض (غير إلزامية)
          patient_name: values.patient_name?.trim() ? values.patient_name.trim() : null,
          national_id: values.national_id?.trim() ? values.national_id.trim() : null,
          phone: values.phone?.trim() ? values.phone.trim() : null,
          gender: values.gender ?? null,
          marital_status: values.marital_status ?? null,
          age: typeof values.age === "number" ? values.age : values.age ? Number(values.age) : null,

          // قسم المناظير ثابت
          department_id: values.department_id,

          // تاريخ الإجراء مخفي مؤقتاً => نسجله تلقائياً وقت الحفظ
          procedure_date: new Date().toISOString(),
          diagnosis_id: values.diagnosis_id ? values.diagnosis_id : null,
          doctor_id: values.doctor_id ? values.doctor_id : null,
          occupation_id: values.occupation_id ? values.occupation_id : null,
          governorate_id: values.governorate_id ? values.governorate_id : null,
          district_id: values.district_id ? values.district_id : null,
          // محطة المناظير ثابتة
          station_id:
            findStationIdByName(["عياده المناظير", "عيادة المناظير"]) ??
            (values.station_id ? values.station_id : null),
          address_details: values.address_details ? values.address_details : null,

          // بيانات الدخول + الخروج (Snapshot)
          admission_date: values.admission_date ? values.admission_date : null,
          discharge_date: values.discharge_date ? values.discharge_date : null,
          // حالة الخروج دائماً "تحسن" كما طلبت
          discharge_status: "تحسن",
          discharge_status_other: (values as any).discharge_status_other?.trim()
            ? (values as any).discharge_status_other.trim()
            : null,

          // قسم الخروج ثابت ومخفي = قسم الدخول (المناظير)
          discharge_department_id: values.department_id,
          discharge_diagnosis_id: values.discharge_diagnosis_id ? values.discharge_diagnosis_id : null,
          discharge_doctor_id: values.discharge_doctor_id ? values.discharge_doctor_id : null,
          internal_number: selectedAdmission?.internal_number || undefined, // Use existing or let DB generate
        };

        const { data, error } = await supabase
          .from("endoscopies")
          .insert([insertData])
          .select()
          .single();
        if (error) throw error;

        // Update admission's internal_number if it was just generated
        if (selectedAdmission && !selectedAdmission.internal_number && data.internal_number) {
          await supabase
            .from("admissions")
            .update({ internal_number: data.internal_number })
            .eq("id", selectedAdmission.id);
        }

        return data;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["endoscopies"] });
        queryClient.invalidateQueries({ queryKey: ["procedures-counts"] });
        showSuccessNotification({
          patient_name: data.patient_name || "-",
          unified_number: data.unified_number,
          internal_number: data.internal_number,
          label: "مناظير",
          created_at: (data as any).created_at ?? null,
        });

        setSelectedAdmission(null);
        setEndoscopyNewMode(false);
        setSearchNumber("");
      },
      onError: (error: any) => {
        sonnerToast.error("خطأ في الحفظ", {
          description: error.message || "حدث خطأ أثناء محاولة حفظ المناظير",
          duration: 8000,
        });
      },
    });
 
   const onSubmit = (data: ProcedureFormValues) => {
     const missing = validateRequired(data);
     if (missing) {
       form.setError(missing, { type: "manual", message: "هذا الحقل إلزامي" });
       return;
     }
      setPendingSubmit(data);
      setReviewOpen(true);
   };
 
   const handleTabChange = (newTab: ProcedureType) => {
     setActiveTab(newTab);
      if (newTab !== "endoscopy") setEndoscopyNewMode(false);
   };

    // عند فتح تبويب المناظير: لو الرقم الموحد مكتوب بالفعل، جرّب تحميله تلقائياً
    useEffect(() => {
      if (activeTab !== "endoscopy") return;
      if (!searchNumber.trim()) return;
      if (selectedAdmission || endoscopyNewMode) return;
      void handleSearch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // عند تغيير التبويب: ثبت/فلتر قسم الخروج حسب المطلوب
    useEffect(() => {
      if (!departments) return;

      if (activeTab === "kidney") {
        const id = findDepartmentIdByName(["الغسيل الكلوي", "غسيل كلوي"]);
        if (id) form.setValue("discharge_department_id", id);
        return;
      }

      if (activeTab === "reception") {
        const id = findDepartmentIdByName(["الاستقبال", "استقبال"]);
        if (id) form.setValue("discharge_department_id", id);
        return;
      }

      if (activeTab === "procedure") {
        // لو القيمة الحالية ليست ضمن (رجال/حريم) امسحها
        const allowed = new Set(getDepartmentsByName(["بذل حريم بطن", "رجال بذل بطن", "بذل رجال بطن"]).map((d) => d.id));
        const current = form.getValues("discharge_department_id") || "";
        if (current && !allowed.has(current)) form.setValue("discharge_department_id", "");
      }
    }, [activeTab, departments]);
 
   const getTabInfo = () => {
     switch (activeTab) {
       case "procedure":
         return { icon: Syringe, title: "تسجيل بذل", color: "text-green" };
       case "reception":
         return { icon: UserCheck, title: "تسجيل استقبال", color: "text-cyan" };
       case "kidney":
         return { icon: Activity, title: "تسجيل كلي", color: "text-orange" };
        case "endoscopy":
          return { icon: Eye, title: "تسجيل مناظير", color: "text-purple" };
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
              <p className="text-muted-foreground">البذل - الاستقبال - الغسيل الكلوي - المناظير</p>
           </div>
           <TimeFilter value={timeRange} onChange={setTimeRange} />
         </div>
 
         {/* Colored Tabs */}
         <div className="sticky top-16 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4">
            <div className="grid gap-3 grid-cols-1 md:grid-cols-4">
             <ColoredStatTab
               title="البذل"
               value={procedureCounts?.procedure ?? 0}
               subtitle={`خلال ${timeRange === "day" ? "اليوم" : timeRange === "week" ? "الأسبوع" : timeRange === "month" ? "الشهر" : "3 أشهر"}`}
               icon={Syringe}
              color="blue"
               onClick={() => handleTabChange("procedure")}
               active={activeTab === "procedure"}
               details={undefined}
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
                `تحسن ${statusCounts.reception["تحسن"] || 0} • تحويل ${statusCounts.reception["تحويل"] || 0} • وفاة ${statusCounts.reception["وفاة"] || 0} • هروب ${statusCounts.reception["هروب"] || 0} • حسب الطلب ${statusCounts.reception["حسب الطلب"] || 0}` : 
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
                `تحسن ${statusCounts.kidney["تحسن"] || 0} • تحويل ${statusCounts.kidney["تحويل"] || 0} • وفاة ${statusCounts.kidney["وفاة"] || 0} • هروب ${statusCounts.kidney["هروب"] || 0} • حسب الطلب ${statusCounts.kidney["حسب الطلب"] || 0}` : 
                undefined
              }
             />

              <ColoredStatTab
                title="المناظير"
                value={procedureCounts?.endoscopy ?? 0}
                subtitle={`خلال ${timeRange === "day" ? "اليوم" : timeRange === "week" ? "الأسبوع" : timeRange === "month" ? "الشهر" : "3 أشهر"}`}
                icon={Eye}
                color="purple"
                onClick={() => handleTabChange("endoscopy")}
                active={activeTab === "endoscopy"}
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
              <CardDescription>
                ابحث بالرقم الموحد لتحميل بيانات المريض — وفي (المناظير) لو الرقم مش موجود هتقدر تسجل جديد
              </CardDescription>
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

          {/* ملخص الرقم الموحد (للمناظير) */}
          {activeTab === "endoscopy" && (selectedAdmission || endoscopyNewMode) && searchNumber.trim() && (
            <Card className="shadow-lg border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">ملخص سريع</CardTitle>
                <CardDescription>عرض فقط — نفس الرقم الذي تم البحث عنه</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-3 text-sm">
                  <div className="p-2 rounded-md bg-secondary/30">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">الرقم الموحد</div>
                    <div className="font-bold tabular-nums" dir="ltr">{searchNumber.trim()}</div>
                  </div>
                  <div className="p-2 rounded-md bg-secondary/30 md:col-span-2">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">اسم المريض</div>
                    <div className="font-semibold truncate">{selectedAdmission?.patient_name || "-"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
 
         {/* Patient Data Display Card */}
          {selectedAdmission ? (
            <OldFileNotice
              unifiedNumber={selectedAdmission.unified_number}
              internalNumber={(selectedAdmission as any).internal_number ?? null}
              lastSeenAt={(selectedAdmission as any).created_at ?? null}
            />
          ) : null}

         {selectedAdmission && (
          <Card className="shadow-2xl border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 animate-fade-in">
             <CardHeader className="pb-3">
              <CardTitle className="text-primary flex items-center gap-2">
                <span className="text-2xl">👤</span>
                بيانات المريض
                {selectedAdmission.admission_source === "طوارئ" && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/90 text-white text-sm font-bold shadow-lg animate-pulse">
                    <span className="text-lg">🚨</span>
                    طوارئ
                  </span>
                )}
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
          {activeTab !== "endoscopy" && selectedAdmission && (
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
                      <FormItem>
                        <FormLabel>تاريخ ووقت التسجيل (تلقائي)</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            value={new Date().toISOString().slice(0, 16)}
                            readOnly
                            aria-readonly
                          />
                        </FormControl>
                      </FormItem>

                      {showField("diagnosis_id") && (
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
                      )}
 
                      {showField("doctor_id") && (
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
                      )}
 
                      {showField("procedure_date") && (
                        <FormField
                          control={form.control}
                          name="procedure_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                تاريخ وساعة الإجراء {isRequired("procedure_date") ? "*" : ""}
                              </FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                       {showField("discharge_department_id") && (
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
                       )}

                       {showField("procedure_status") && (
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
                                   onAddNew={() => setShowExitStatusDialog(true)}
                                   onManage={() => setShowExitStatusManage(true)}
                                   addNewLabel="إضافة حالة خروج"
                                 />
                               </FormControl>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                       )}

                      {/* تم إزالة تحويل/وفاة/هروب/حسب الطلب من حالات الخروج حسب طلبك */}

                       {selectedAdmission?.admission_source === "طوارئ" && showField("transferred_from_department_id") && (
                        <FormField
                          control={form.control}
                          name="transferred_from_department_id"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel className="flex items-center gap-2">
                                <span>تحويل داخل المستشفى</span>
                                <span className="text-xs bg-amber-500/20 text-amber-700 px-2 py-0.5 rounded-full">
                                  للمرضى القادمين من الطوارئ
                                </span>
                              </FormLabel>
                              <FormControl>
                                <SearchableSelect
                                  value={field.value || ""}
                                  onValueChange={field.onChange}
                                  options={departments || []}
                                  placeholder="اختر القسم المحول إليه"
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
                             transferred_from_department_id: "",
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

          {/* Endoscopy Form (works سواء تم تحميل دخول أو تسجيل جديد) */}
          {activeTab === "endoscopy" && (selectedAdmission || endoscopyNewMode) && (
            <EndoscopyForm
              unifiedNumber={searchNumber.trim()}
              defaultValues={
                selectedAdmission
                  ? {
                      patient_name: selectedAdmission.patient_name,
                      national_id: selectedAdmission.national_id ?? "",
                      phone: selectedAdmission.phone ?? "",
                      gender: (selectedAdmission.gender as any) ?? "ذكر",
                      marital_status: (selectedAdmission.marital_status as any) ?? "أعزب",
                      age: selectedAdmission.age ?? 0,
                      // تأكيد قسم المناظير
                      department_id: endoscopyDepartments?.[0]?.id ?? selectedAdmission.department_id,
                      diagnosis_id: selectedAdmission.diagnosis_id ?? "",
                      doctor_id: selectedAdmission.doctor_id ?? "",
                      occupation_id: selectedAdmission.occupation_id ?? "",
                      governorate_id: selectedAdmission.governorate_id ?? "",
                      district_id: selectedAdmission.district_id ?? "",
                      station_id:
                        findStationIdByName(["عياده المناظير", "عيادة المناظير"]) ??
                        (selectedAdmission.station_id ?? ""),
                      address_details: selectedAdmission.address_details ?? "",
                      admission_date: selectedAdmission.admission_date
                        ? new Date(selectedAdmission.admission_date).toISOString().slice(0, 16)
                        : "",
                      discharge_status_mode: "تحسن",
                    }
                  : undefined
              }
              // نفس فكرة التبويب: المناظير فقط
              departments={endoscopyDepartments}
               manageDepartments={departments || []}
              exitStatuses={(exitStatuses || []).map((s: any) => ({ id: s.name as string, name: s.name as string }))}
              doctors={doctors || []}
              diagnoses={diagnoses || []}
              occupations={occupations || []}
              governorates={governorates || []}
              districts={districts || []}
              stations={(() => {
                const id = findStationIdByName(["عياده المناظير", "عيادة المناظير"]);
                const match = (stations || []).find((s: any) => s.id === id);
                return match ? [match] : [];
              })()}
              isSubmitting={endoscopyMutation.isPending}
              onSubmit={(values) => {
                setPendingEndo(values);
                setEndoReviewOpen(true);
              }}
            />
          )}

          <PreSaveReviewDialog
            open={reviewOpen}
            onOpenChange={setReviewOpen}
            title="مراجعة قبل الحفظ"
            description="راجع بيانات المريض وبيانات الإجراء ثم أكد الحفظ."
            fixed={[
              { label: "اسم المريض", value: selectedAdmission?.patient_name ?? "-" },
              { label: "الرقم الموحد", value: selectedAdmission?.unified_number ?? searchNumber.trim() },
              { label: "الرقم الداخلي", value: (selectedAdmission as any)?.internal_number ?? "سيُنشأ عند أول خروج" },
            ]}
            visit={[
              { label: "نوع الإجراء", value: activeTab },
              { label: "تاريخ/وقت الإجراء", value: pendingSubmit?.procedure_date ?? form.getValues("procedure_date") },
              { label: "حالة الخروج", value: pendingSubmit?.procedure_status ?? form.getValues("procedure_status") },
            ]}
            confirmLabel="تأكيد حفظ الإجراء"
            loading={mutation.isPending}
            onConfirm={() => {
              if (!pendingSubmit) return;
              setReviewOpen(false);
              mutation.mutate(pendingSubmit);
              setPendingSubmit(null);
            }}
          />

          <PreSaveReviewDialog
            open={endoReviewOpen}
            onOpenChange={setEndoReviewOpen}
            title="مراجعة قبل حفظ المناظير"
            description="راجع البيانات سريعاً ثم أكد الحفظ."
            fixed={[
              { label: "الرقم الموحد", value: searchNumber.trim() },
              { label: "الرقم الداخلي", value: (selectedAdmission as any)?.internal_number ?? "سيُنشأ عند أول خروج" },
            ]}
            visit={[
              { label: "اسم المريض", value: pendingEndo?.patient_name ?? "-" },
              { label: "تاريخ المنظار", value: pendingEndo?.procedure_date ?? "-" },
              { label: "حالة الخروج", value: pendingEndo?.discharge_status ?? "-" },
            ]}
            confirmLabel="تأكيد حفظ المناظير"
            loading={endoscopyMutation.isPending}
            onConfirm={() => {
              if (!pendingEndo) return;
              setEndoReviewOpen(false);
              endoscopyMutation.mutate(pendingEndo);
              setPendingEndo(null);
            }}
          />

          {showHospitalManage && (
            <LookupManageDialog
              type="hospital"
              open={showHospitalManage}
              onOpenChange={setShowHospitalManage}
              items={hospitals || []}
            />
          )}

          {showExitStatusDialog && (
            <LookupCreateDialog
              type="exit_status"
              open={showExitStatusDialog}
              onOpenChange={setShowExitStatusDialog}
              onCreated={(item) => {
                form.setValue("procedure_status", item.name);
                setShowExitStatusDialog(false);
              }}
            />
          )}

          {showExitStatusManage && (
            <LookupManageDialog
              type="exit_status"
              open={showExitStatusManage}
              onOpenChange={setShowExitStatusManage}
              items={(exitStatuses || []).map((s: any) => ({ id: s.id as string, name: s.name as string }))}
            />
          )}
       </div>
     </Layout>
   );
 }