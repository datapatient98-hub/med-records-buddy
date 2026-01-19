import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, Save, FileArchive } from "lucide-react";

const loanSchema = z.object({
  borrowed_by: z.string().min(1, "اسم المستعير مطلوب"),
  borrowed_to_department: z.string().min(1, "القسم المستعار إليه مطلوب"),
  loan_date: z.string().min(1, "تاريخ الاستعارة مطلوب"),
});

type LoanFormValues = z.infer<typeof loanSchema>;

export default function Loans() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchNumber, setSearchNumber] = useState("");
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null);

  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      loan_date: new Date().toISOString().slice(0, 16),
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
      .single();

    if (error || !data) {
      toast({
        title: "لم يتم العثور على المريض",
        description: "تأكد من الرقم الموحد",
        variant: "destructive",
      });
      return;
    }

    setSelectedAdmission(data);
  };

  const mutation = useMutation({
    mutationFn: async (values: LoanFormValues) => {
      if (!selectedAdmission) return;

      const { data, error } = await supabase
        .from("file_loans")
        .insert([{
          admission_id: selectedAdmission.id,
          unified_number: selectedAdmission.unified_number,
          internal_number: selectedAdmission.internal_number,
          borrowed_by: values.borrowed_by,
          borrowed_to_department: values.borrowed_to_department,
          loan_date: values.loan_date,
          is_returned: false,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["file_loans"] });
      toast({
        title: "تم الحفظ بنجاح",
        description: `تم تسجيل استعارة ملف ${selectedAdmission.patient_name}`,
      });
      form.reset({ loan_date: new Date().toISOString().slice(0, 16) });
      setSelectedAdmission(null);
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

  const onSubmit = (data: LoanFormValues) => {
    mutation.mutate(data);
  };

  // Fetch unreturned loans
  const { data: unreturnedLoans } = useQuery({
    queryKey: ["unreturned-loans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("file_loans")
        .select("*, admissions(patient_name)")
        .eq("is_returned", false)
        .order("loan_date", { ascending: false });
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">استعارة الملفات</h2>
        <p className="text-muted-foreground">تسجيل وتتبع الملفات المستعارة</p>
      </div>

      {/* Unreturned Loans Alert */}
      {unreturnedLoans && unreturnedLoans.length > 0 && (
        <Card className="shadow-lg border-orange bg-orange/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange">
              <FileArchive className="h-5 w-5" />
              تنبيه: {unreturnedLoans.length} ملف مستعار لم يتم إرجاعه
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unreturnedLoans.slice(0, 5).map((loan) => (
                <div key={loan.id} className="p-3 rounded-lg bg-card border border-orange/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{loan.admissions?.patient_name}</p>
                      <p className="text-sm text-muted-foreground">
                        رقم موحد: {loan.unified_number} | مستعار لـ: {loan.borrowed_to_department}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(loan.loan_date).toLocaleDateString("ar-EG")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg border-border">
        <CardHeader>
          <CardTitle>تسجيل استعارة جديدة</CardTitle>
          <CardDescription>ابحث عن المريض بالرقم الموحد</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search */}
          <div className="flex gap-2">
            <Input
              placeholder="الرقم الموحد"
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch}>
              <Search className="ml-2 h-4 w-4" />
              بحث
            </Button>
          </div>

          {/* Patient Info */}
          {selectedAdmission && (
            <div className="p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">اسم المريض</p>
                  <p className="font-semibold">{selectedAdmission.patient_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">الرقم الموحد</p>
                  <p className="font-semibold">{selectedAdmission.unified_number}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">الرقم الداخلي</p>
                  <p className="font-semibold">{selectedAdmission.internal_number}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loan Form */}
          {selectedAdmission && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="borrowed_by"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم المستعير *</FormLabel>
                        <FormControl>
                          <Input placeholder="اسم الشخص المستعير" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="borrowed_to_department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>القسم المستعار إليه *</FormLabel>
                        <FormControl>
                          <Input placeholder="اسم القسم" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="loan_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاريخ وساعة الاستعارة *</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
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
                      setSelectedAdmission(null);
                      setSearchNumber("");
                      form.reset();
                    }}
                  >
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={mutation.isPending}>
                    <Save className="ml-2 h-4 w-4" />
                    {mutation.isPending ? "جاري الحفظ..." : "تسجيل الاستعارة"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}