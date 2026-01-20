import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import ColoredStatTab from "@/components/ColoredStatTab";
import TimeFilter, { type TimeRange, getTimeRangeDates } from "@/components/TimeFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { FileArchive, Save, Search, FolderOpen, FolderCheck, Files } from "lucide-react";

const loanSchema = z.object({
  borrowed_by: z.string().min(1, "اسم المستعير مطلوب"),
  borrowed_to_department: z.string().min(1, "القسم المستعار إليه مطلوب"),
  loan_date: z.string().min(1, "تاريخ الاستعارة مطلوب"),
});

type LoanFormValues = z.infer<typeof loanSchema>;

type LoanTab = "borrowed" | "returned" | "all";

type LoanRow = {
  id: string;
  unified_number: string;
  internal_number: number;
  borrowed_by: string;
  borrowed_to_department: string;
  loan_date: string;
  return_date: string | null;
  is_returned: boolean | null;
  admissions?: { patient_name: string } | null;
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-EG");
}

export default function Loans() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<LoanTab>("borrowed");
  const [searchNumber, setSearchNumber] = useState("");
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("month");

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

  const { data: loans } = useQuery({
    queryKey: ["file_loans", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("file_loans")
        .select("*, admissions(patient_name)")
        .order("loan_date", { ascending: false });
      if (error) throw error;
      return (data || []) as LoanRow[];
    },
  });

  const borrowedLoans = useMemo(() => (loans || []).filter((l) => l.is_returned === false), [loans]);
  const returnedLoans = useMemo(() => (loans || []).filter((l) => l.is_returned === true), [loans]);

  const mutation = useMutation({
    mutationFn: async (values: LoanFormValues) => {
      if (!selectedAdmission) return;

      const { data, error } = await supabase
        .from("file_loans")
        .insert([
          {
            admission_id: selectedAdmission.id,
            unified_number: selectedAdmission.unified_number,
            internal_number: selectedAdmission.internal_number,
            borrowed_by: values.borrowed_by,
            borrowed_to_department: values.borrowed_to_department,
            loan_date: values.loan_date,
            is_returned: false,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["file_loans"] });
      toast({
        title: "تم الحفظ بنجاح",
        description: selectedAdmission
          ? `تم تسجيل استعارة ملف ${selectedAdmission.patient_name}`
          : "تم تسجيل الاستعارة",
      });
      form.reset({ loan_date: new Date().toISOString().slice(0, 16) });
      setSelectedAdmission(null);
      setSearchNumber("");
      setActiveTab("borrowed");
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في الحفظ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoanFormValues) => mutation.mutate(data);

  const loansForTab = activeTab === "borrowed" ? borrowedLoans : activeTab === "returned" ? returnedLoans : loans || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground">الاستعارات</h2>
            <p className="text-muted-foreground">تسجيل وتتبع الملفات المستعارة</p>
          </div>
        </div>

        {/* Tabs (Top) */}
        <Card className="shadow-lg border-border">
          <CardHeader className="sticky top-28 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LoanTab)}>
              <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-xl border border-border bg-muted/30 p-2 md:grid-cols-3">
                <TabsTrigger
                  value="borrowed"
                  className="p-0 rounded-lg data-[state=active]:shadow-medical-lg data-[state=active]:ring-1 data-[state=active]:ring-ring"
                >
                  <div className="w-full rounded-lg bg-card p-4 text-right">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">حالات تم استعارتها</p>
                        <p className="text-3xl font-bold text-foreground">{borrowedLoans.length}</p>
                        <p className="text-xs text-muted-foreground">ملفات لم تُرجع بعد</p>
                      </div>
                    </div>
                  </div>
                </TabsTrigger>

                <TabsTrigger
                  value="returned"
                  className="p-0 rounded-lg data-[state=active]:shadow-medical-lg data-[state=active]:ring-1 data-[state=active]:ring-ring"
                >
                  <div className="w-full rounded-lg bg-card p-4 text-right">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">حالات تم رجعوها</p>
                        <p className="text-3xl font-bold text-foreground">{returnedLoans.length}</p>
                        <p className="text-xs text-muted-foreground">ملفات أُعيدت</p>
                      </div>
                    </div>
                  </div>
                </TabsTrigger>

                <TabsTrigger
                  value="all"
                  className="p-0 rounded-lg data-[state=active]:shadow-medical-lg data-[state=active]:ring-1 data-[state=active]:ring-ring"
                >
                  <div className="w-full rounded-lg bg-card p-4 text-right">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">عدد الحالات كلها</p>
                        <p className="text-3xl font-bold text-foreground">{(loans || []).length}</p>
                        <p className="text-xs text-muted-foreground">الإجمالي</p>
                      </div>
                    </div>
                  </div>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="borrowed" className="hidden" />
              <TabsContent value="returned" className="hidden" />
              <TabsContent value="all" className="hidden" />
            </Tabs>
          </CardHeader>
        </Card>

        {/* Registration (under tabs) */}
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

        {/* Tracking (under registration) */}
        <Card className="shadow-lg border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileArchive className="h-5 w-5" />
              متابعة الاستعارات
            </CardTitle>
            <CardDescription>حسب التاب المختار بالأعلى</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {activeTab === "borrowed" && borrowedLoans.length > 0 && (
              <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm text-foreground">
                  تنبيه: يوجد <span className="font-semibold">{borrowedLoans.length}</span> ملف مستعار لم يتم إرجاعه.
                </p>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المريض</TableHead>
                  <TableHead className="text-right">الرقم الموحد</TableHead>
                  <TableHead className="text-right">القسم</TableHead>
                  <TableHead className="text-right">المستعير</TableHead>
                  <TableHead className="text-right">تاريخ الاستعارة</TableHead>
                  <TableHead className="text-right">تاريخ الإرجاع</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loansForTab.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-right text-muted-foreground" colSpan={6}>
                      لا توجد بيانات.
                    </TableCell>
                  </TableRow>
                ) : (
                  loansForTab.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="text-right font-medium">{loan.admissions?.patient_name ?? "—"}</TableCell>
                      <TableCell className="text-right">{loan.unified_number}</TableCell>
                      <TableCell className="text-right">{loan.borrowed_to_department}</TableCell>
                      <TableCell className="text-right">{loan.borrowed_by}</TableCell>
                      <TableCell className="text-right">{formatDateTime(loan.loan_date)}</TableCell>
                      <TableCell className="text-right">{formatDateTime(loan.return_date)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
