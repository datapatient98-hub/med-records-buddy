import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { getAgeFromEgyptNationalId } from "@/lib/egyptNationalId";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchableSelect from "@/components/SearchableSelect";
import { Save } from "lucide-react";
import LookupCreateDialog, { type LookupCreateType } from "@/components/LookupCreateDialog";
import LookupManageDialog from "@/components/LookupManageDialog";

type Option = { id: string; name: string };

const digitsOnlyOptional = (msg: string) => z.string().trim().regex(/^\d+$/, msg).optional().or(z.literal(""));

const endoscopySchema = z.object({
  // ملاحظة: حسب طلبك، الحقول التالية غير إلزامية داخل المناظير (السجل قد يكون غير مكتمل)
  patient_name: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || v.split(/\s+/).filter(Boolean).length === 0 || v.split(/\s+/).filter(Boolean).length >= 4, "الاسم رباعي"),
  national_id: digitsOnlyOptional("الرقم القومي يجب أن يكون أرقام فقط").refine((v) => !v || v.length === 14, "الرقم القومي يجب أن يكون 14 رقم"),
  phone: digitsOnlyOptional("رقم الهاتف يجب أن يكون أرقام فقط").refine((v) => !v || v.length === 11, "رقم الهاتف يجب أن يكون 11 رقم"),
  gender: z.enum(["ذكر", "أنثى"]).optional(),
  marital_status: z.enum(["أعزب", "متزوج", "مطلق", "أرمل"]).optional(),
  age: z.coerce.number().min(0, "السن يجب أن يكون رقم موجب").optional(),
  department_id: z.string().min(1, "القسم مطلوب"),
  // سيتم تسجيله تلقائياً (مخفي مؤقتاً)
  procedure_date: z.string().optional().or(z.literal("")),
  diagnosis_id: z.string().optional(),
  doctor_id: z.string().optional(),
  occupation_id: z.string().optional(),
  governorate_id: z.string().optional(),
  district_id: z.string().optional(),
  station_id: z.string().optional(),
  address_details: z.string().optional(),

  // بيانات الدخول (Snapshot)
  admission_date: z.string().optional().or(z.literal("")),

  // بيانات الخروج (Snapshot)
  discharge_date: z.string().optional().or(z.literal("")),
  discharge_status: z.enum(["تحسن", "تحويل", "وفاة", "هروب", "رفض العلاج"]).optional(),
  discharge_department_id: z.string().optional().or(z.literal("")),
  discharge_diagnosis_id: z.string().optional().or(z.literal("")),
  discharge_doctor_id: z.string().optional().or(z.literal("")),

  // تبسيط حالة الخروج: تحسن (افتراضي) أو أخرى من قائمة قابلة للإدارة
  discharge_status_mode: z.enum(["تحسن", "أخرى"]).optional(),
  discharge_status_other: z.string().trim().optional().or(z.literal("")),
});

export type EndoscopyFormValues = z.infer<typeof endoscopySchema>;

type Props = {
  unifiedNumber: string;
  defaultValues?: Partial<EndoscopyFormValues>;
  departments: Option[];
  /** Full departments list for إدارة القوائم (حتى لو الحقل نفسه فلتر) */
  manageDepartments?: Option[];
  exitStatuses: Option[];
  doctors: Option[];
  diagnoses: Option[];
  occupations: Option[];
  governorates: Option[];
  districts: Option[];
  stations: Option[];
  onSubmit: (values: EndoscopyFormValues) => void;
  isSubmitting?: boolean;
};

export default function EndoscopyForm({
  unifiedNumber,
  defaultValues,
  departments,
  manageDepartments,
  exitStatuses,
  doctors,
  diagnoses,
  occupations,
  governorates,
  districts,
  stations,
  onSubmit,
  isSubmitting,
}: Props) {
  const form = useForm<EndoscopyFormValues>({
    resolver: zodResolver(endoscopySchema),
    defaultValues: {
      patient_name: "",
      national_id: "",
      phone: "",
      gender: undefined,
      marital_status: undefined,
      age: undefined,
      department_id: "",
      procedure_date: new Date().toISOString().slice(0, 16),
      diagnosis_id: "",
      doctor_id: "",
      occupation_id: "",
      governorate_id: "",
      district_id: "",
      station_id: "",
      address_details: "",

      admission_date: "",
      discharge_date: "",
      discharge_status: undefined,
      discharge_department_id: "",
      discharge_diagnosis_id: "",
      discharge_doctor_id: "",

      discharge_status_mode: "تحسن",
      discharge_status_other: "",
      ...defaultValues,
    },
  });

  const districtOptions = useMemo(() => districts ?? [], [districts]);

  const [createType, setCreateType] = useState<LookupCreateType | null>(null);
  const [manageType, setManageType] = useState<LookupCreateType | null>(null);

  const governorateId = form.watch("governorate_id") || "";

  // تثبيت قسم المناظير تلقائياً لو القائمة فيها خيار واحد
  useEffect(() => {
    if (departments?.length === 1) {
      const only = departments[0];
      if (only?.id && form.getValues("department_id") !== only.id) {
        form.setValue("department_id", only.id, { shouldDirty: true });
      }

      const currentDischargeDept = form.getValues("discharge_department_id") || "";
      if (!currentDischargeDept) {
        form.setValue("discharge_department_id", only.id, { shouldDirty: true });
      }
    }
  }, [departments, form]);

  const typeToField: Partial<Record<LookupCreateType, keyof EndoscopyFormValues>> = {
    diagnosis: "diagnosis_id",
    doctor: "doctor_id",
    occupation: "occupation_id",
    governorate: "governorate_id",
    district: "district_id",
    station: "station_id",
    department: "department_id",
  };

  const itemsForManage = useMemo(() => {
    const map: Record<LookupCreateType, Option[]> = {
      department: manageDepartments ?? departments,
      diagnosis: diagnoses,
      doctor: doctors,
      governorate: governorates,
      occupation: occupations,
      station: stations,
      district: districts,
      hospital: [],
      exit_status: exitStatuses,
    };
    return map;
  }, [departments, diagnoses, doctors, districts, exitStatuses, governorates, manageDepartments, occupations, stations]);

  // السن تلقائي من الرقم القومي
  const nationalId = form.watch("national_id") || "";
  useEffect(() => {
    const age = getAgeFromEgyptNationalId(nationalId);
    if (typeof age === "number") {
      form.setValue("age", age, { shouldDirty: true });
    }
    // لو الرقم غير صحيح لا نلمس السن (عشان ممكن يكون مكتوب يدوي)
  }, [form, nationalId]);

  // تثبيت المحطة = عيادة المناظير (لو القائمة فيها خيار واحد)
  useEffect(() => {
    if (stations?.length === 1) {
      const only = stations[0];
      if (only?.id && form.getValues("station_id") !== only.id) {
        form.setValue("station_id", only.id, { shouldDirty: true });
      }
    }
  }, [form, stations]);

  // حالة الخروج الافتراضية = تحسن، ولو (أخرى) نستخدم discharge_status_other
  const dischargeMode = form.watch("discharge_status_mode") || "تحسن";
  useEffect(() => {
    // نحفظ في الحقل enum دائماً "تحسن" كما طلبت
    form.setValue("discharge_status", "تحسن", { shouldDirty: true });
    if (dischargeMode !== "أخرى") {
      const current = form.getValues("discharge_status_other");
      if (current) form.setValue("discharge_status_other", "", { shouldDirty: true });
    }
  }, [dischargeMode, form]);

  return (
    <Card className="shadow-lg border-border">
      <CardHeader>
        <CardTitle>تسجيل المناظير</CardTitle>
        <CardDescription>
          الرقم الموحد: <span className="font-bold" dir="ltr">{unifiedNumber}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* ملخص سريع (عرض فقط) */}
            <div className="grid gap-3 rounded-lg border bg-card/50 p-4 md:grid-cols-3">
              <div>
                <div className="text-xs font-semibold text-muted-foreground">الرقم الموحد</div>
                <div className="font-bold tabular-nums" dir="ltr">{unifiedNumber}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs font-semibold text-muted-foreground">اسم المريض</div>
                <div className="font-semibold truncate">{form.watch("patient_name") || "-"}</div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="patient_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المريض</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="الاسم رباعي" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>الرقم الموحد</FormLabel>
                <FormControl>
                  <Input value={unifiedNumber} readOnly aria-readonly className="font-bold tabular-nums" dir="ltr" />
                </FormControl>
              </FormItem>

              <FormField
                control={form.control}
                name="national_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الرقم القومي</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={14} placeholder="14 رقم" inputMode="numeric" />
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
                    <FormLabel>الهاتف</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={11} placeholder="11 رقم" inputMode="numeric" />
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
                    <FormLabel>النوع</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
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
                control={form.control}
                name="marital_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الحالة الاجتماعية</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
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
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>السن</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} placeholder="بالسنوات" />
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
                    <FormLabel>قسم المناظير</FormLabel>
                    <FormControl>
                      <div className="pointer-events-none opacity-90">
                        <SearchableSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          options={departments}
                          placeholder="قسم المناظير"
                          emptyText="لا توجد أقسام"
                          allowClear={false}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* تاريخ وساعة الإجراء: مخفي مؤقتاً ويتم تسجيله تلقائياً */}

              {/* بيانات الدخول */}
              <FormField
                control={form.control}
                name="admission_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ وساعة الدخول</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
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
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        options={diagnoses}
                        placeholder="اختر التشخيص"
                        emptyText="لا توجد بيانات"
                        onAddNew={() => setCreateType("diagnosis")}
                        onManage={() => setManageType("diagnosis")}
                        addNewLabel="إضافة تشخيص"
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
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        options={doctors}
                        placeholder="اختر الطبيب"
                        emptyText="لا توجد بيانات"
                        onAddNew={() => setCreateType("doctor")}
                        onManage={() => setManageType("doctor")}
                        addNewLabel="إضافة طبيب"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* بيانات الخروج */}
              <FormField
                control={form.control}
                name="discharge_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ وساعة الخروج</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discharge_status_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حالة الخروج</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "تحسن"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="تحسن">تحسن</SelectItem>
                        <SelectItem value="أخرى">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {dischargeMode === "أخرى" && (
                <FormField
                  control={form.control}
                  name="discharge_status_other"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>أخرى (اختر/أضف/احذف)</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          options={exitStatuses}
                          placeholder="اختر سبب/حالة أخرى"
                          emptyText="لا توجد بيانات"
                          onAddNew={() => setCreateType("exit_status")}
                          onManage={() => setManageType("exit_status")}
                          addNewLabel="إضافة حالة خروج"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* قسم الخروج: ثابت ومخفي */}

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
                        options={diagnoses}
                        placeholder="اختر التشخيص"
                        emptyText="لا توجد بيانات"
                        onAddNew={() => setCreateType("diagnosis")}
                        onManage={() => setManageType("diagnosis")}
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
                        options={doctors}
                        placeholder="اختر الطبيب"
                        emptyText="لا توجد بيانات"
                        onAddNew={() => setCreateType("doctor")}
                        onManage={() => setManageType("doctor")}
                        addNewLabel="إضافة طبيب"
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
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        options={occupations}
                        placeholder="اختر المهنة"
                        emptyText="لا توجد بيانات"
                        onAddNew={() => setCreateType("occupation")}
                        onManage={() => setManageType("occupation")}
                        addNewLabel="إضافة مهنة"
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
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        options={governorates}
                        placeholder="اختر المحافظة"
                        emptyText="لا توجد بيانات"
                        onAddNew={() => setCreateType("governorate")}
                        onManage={() => setManageType("governorate")}
                        addNewLabel="إضافة محافظة"
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
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        options={districtOptions}
                        placeholder="اختر المركز"
                        emptyText="لا توجد بيانات"
                        onAddNew={() => setCreateType("district")}
                        onManage={() => setManageType("district")}
                        addNewLabel="إضافة مركز"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* المحطة: ثابتة = عيادة المناظير */}

              <FormField
                control={form.control}
                name="address_details"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>العنوان التفصيلي</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="مثال: شارع... عمارة... شقة..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "جاري الحفظ..." : "حفظ المناظير"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>

      {createType && (
        <LookupCreateDialog
          open={!!createType}
          type={createType}
          onOpenChange={(open) => {
            if (!open) setCreateType(null);
          }}
          context={
            createType === "district" && governorateId
              ? { governorate_id: governorateId }
              : undefined
          }
          onCreated={(item) => {
            const field = typeToField[createType];
            if (field) form.setValue(field as any, item.id as any);
            setCreateType(null);
          }}
        />
      )}

      {manageType && (
        <LookupManageDialog
          open={!!manageType}
          type={manageType}
          onOpenChange={(open) => {
            if (!open) setManageType(null);
          }}
          items={itemsForManage[manageType] || []}
        />
      )}
    </Card>
  );
}
