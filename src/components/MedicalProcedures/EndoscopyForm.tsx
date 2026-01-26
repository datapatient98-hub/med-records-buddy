import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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

const endoscopySchema = z.object({
  patient_name: z.string().min(3, "اسم المريض مطلوب"),
  national_id: z.string().min(14, "الرقم القومي 14 رقم"),
  phone: z.string().min(11, "رقم الهاتف 11 رقم"),
  gender: z.enum(["ذكر", "أنثى"], { required_error: "النوع مطلوب" }),
  marital_status: z.enum(["أعزب", "متزوج", "مطلق", "أرمل"], { required_error: "الحالة الاجتماعية مطلوبة" }),
  age: z.coerce.number().min(0, "السن مطلوب"),
  department_id: z.string().min(1, "القسم مطلوب"),
  procedure_date: z.string().min(1, "تاريخ وساعة الإجراء مطلوب"),
  diagnosis_id: z.string().optional(),
  doctor_id: z.string().optional(),
  occupation_id: z.string().optional(),
  governorate_id: z.string().optional(),
  district_id: z.string().optional(),
  station_id: z.string().optional(),
  address_details: z.string().optional(),
});

export type EndoscopyFormValues = z.infer<typeof endoscopySchema>;

type Props = {
  unifiedNumber: string;
  defaultValues?: Partial<EndoscopyFormValues>;
  departments: Option[];
  /** Full departments list for إدارة القوائم (حتى لو الحقل نفسه فلتر) */
  manageDepartments?: Option[];
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
      gender: "ذكر",
      marital_status: "أعزب",
      age: 0,
      department_id: "",
      procedure_date: new Date().toISOString().slice(0, 16),
      diagnosis_id: "",
      doctor_id: "",
      occupation_id: "",
      governorate_id: "",
      district_id: "",
      station_id: "",
      address_details: "",
      ...defaultValues,
    },
  });

  const districtOptions = useMemo(() => districts ?? [], [districts]);

  const [createType, setCreateType] = useState<LookupCreateType | null>(null);
  const [manageType, setManageType] = useState<LookupCreateType | null>(null);

  const governorateId = form.watch("governorate_id") || "";

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
    };
    return map;
  }, [departments, diagnoses, doctors, districts, governorates, manageDepartments, occupations, stations]);

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
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="patient_name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>اسم المريض *</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>الرقم القومي *</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={14} />
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
                    <FormLabel>الهاتف *</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={11} />
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
                control={form.control}
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
                control={form.control}
                name="department_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>القسم *</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={departments}
                        placeholder="اختر القسم"
                        emptyText="لا توجد أقسام"
                        onAddNew={() => setCreateType("department")}
                        onManage={() => setManageType("department")}
                        addNewLabel="إضافة قسم"
                      />
                    </FormControl>
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

              <FormField
                control={form.control}
                name="station_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المحطة</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        options={stations}
                        placeholder="اختر المحطة"
                        emptyText="لا توجد بيانات"
                        onAddNew={() => setCreateType("station")}
                        onManage={() => setManageType("station")}
                        addNewLabel="إضافة محطة"
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
                  <FormItem className="md:col-span-2">
                    <FormLabel>العنوان التفصيلي</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
