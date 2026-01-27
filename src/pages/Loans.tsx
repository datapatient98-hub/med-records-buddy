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
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileArchive, Save, Search, FolderOpen, FolderCheck, Files } from "lucide-react";
import LoanSuggestInput from "@/components/LoanSuggestInput";
import LoanLookupCreateDialog, { type LoanLookupType } from "@/components/LoanLookupCreateDialog";
import LoanLookupManageDialog from "@/components/LoanLookupManageDialog";

const loanSchema = z.object({
  borrowed_by: z.string().min(1, "اسم المستعير مطلوب"),
  borrowed_to_department: z.string().min(1, "القسم المستعار إليه مطلوب"),
  loan_reason: z.string().min(1, "سبب الاستعارة مطلوب"),
  loan_date: z.string().min(1, "تاريخ الاستعارة مطلوب"),
});

type LoanFormValues = z.infer<typeof loanSchema>;

type LoanTab = "borrowed" | "returned" | "all";

type LoanRow = {
  id: string;
  unified_number: string;
  internal_number?: number | null;
  borrowed_by: string;
  borrowed_to_department: string;
  loan_reason: string;
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
  const [loansSearch, setLoansSearch] = useState("");
  const [lastAdmissionInternalNumber, setLastAdmissionInternalNumber] = useState<number | null>(null);
  const [activeLoanInfo, setActiveLoanInfo] = useState<LoanRow | null>(null);

  const [loanLookupType, setLoanLookupType] = useState<LoanLookupType>("borrower");
  const [lookupCreateOpen, setLookupCreateOpen] = useState(false);
  const [lookupManageOpen, setLookupManageOpen] = useState(false);
  const [lookupInitialName, setLookupInitialName] = useState<string>("");

  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [loanToReturn, setLoanToReturn] = useState<LoanRow | null>(null);
  const [returnDateLocal, setReturnDateLocal] = useState(() => new Date().toISOString().slice(0, 16));

  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      borrowed_by: "",
      borrowed_to_department: "",
      loan_reason: "",
      loan_date: new Date().toISOString().slice(0, 16),
    },
  });

  const { data: borrowersOptions = [] } = useQuery({
    queryKey: ["loan_borrowers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("loan_borrowers").select("id, name").order("name");
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string }>;
    },
  });

  const { data: toDeptOptions = [] } = useQuery({
    queryKey: ["loan_to_departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("loan_to_departments").select("id, name").order("name");
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string }>;
    },
  });

  const { data: reasonOptions = [] } = useQuery({
    queryKey: ["loan_reasons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("loan_reasons").select("id, name").order("name");
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string }>;
    },
  });

  const ensureLookupValue = async (type: LoanLookupType, rawName: string) => {
    const clean = rawName.trim();
    if (!clean) return;
    const table = type === "borrower" ? "loan_borrowers" : type === "to_department" ? "loan_to_departments" : "loan_reasons";
    const { error } = await supabase.from(table as any).insert([{ name: clean }]);
    if (error) {
      const msg = (error as any)?.message ?? "";
      const code = (error as any)?.code;
      if (code === "23505" || msg.toLowerCase().includes("duplicate")) return;
      // لا نوقف حفظ الاستعارة لو تحديث القوائم فشل
      return;
    }
  };

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
      .eq("unified_number", searchNumber.trim())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      toast({
        title: "لم يتم العثور على المريض",
        description: "تأكد من الرقم الموحد",
        variant: "destructive",
      });
      return;
    }

    setSelectedAdmission(data);

    // fetch latest internal_number (if discharged) + current active loan (if any)
    const [lastDischargeRes, activeLoanRes] = await Promise.all([
      supabase
        .from("discharges")
        .select("internal_number, discharge_date")
        .eq("admission_id", data.id)
        .order("discharge_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("file_loans")
        .select("*, admissions(patient_name)")
        .eq("unified_number", data.unified_number)
        .eq("is_returned", false)
        .order("loan_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    setLastAdmissionInternalNumber((lastDischargeRes.data as any)?.internal_number ?? null);
    setActiveLoanInfo((activeLoanRes.data as any) ?? null);
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

       await Promise.all([
         ensureLookupValue("borrower", values.borrowed_by),
         ensureLookupValue("to_department", values.borrowed_to_department),
         ensureLookupValue("reason", values.loan_reason),
       ]);

      const { data, error } = await supabase
        .from("file_loans")
        .insert([
          {
            admission_id: selectedAdmission.id,
            unified_number: selectedAdmission.unified_number,
            borrowed_by: values.borrowed_by,
            borrowed_to_department: values.borrowed_to_department,
            loan_reason: values.loan_reason,
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
      form.reset({
        borrowed_by: "",
        borrowed_to_department: "",
        loan_reason: "",
        loan_date: new Date().toISOString().slice(0, 16),
      });
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

  const returnMutation = useMutation({
    mutationFn: async (params: { loanId: string; returnDateLocal: string }) => {
      const iso = new Date(params.returnDateLocal).toISOString();
      const { data, error } = await supabase
        .from("file_loans")
        .update({ is_returned: true, return_date: iso })
        .eq("id", params.loanId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["file_loans"] });
      queryClient.invalidateQueries({ queryKey: ["unreturned-loans-count"] });
      queryClient.invalidateQueries({ queryKey: ["loans-notifications-latest"] });
      setReturnDialogOpen(false);
      setLoanToReturn(null);
      toast({
        title: "تم تسجيل الإرجاع",
        description: "تم تحديث حالة الاستعارة إلى (تم الإرجاع).",
      });
    },
    onError: (error: any) => {
      toast({
        title: "تعذر تسجيل الإرجاع",
        description: error?.message || "حدث خطأ أثناء تحديث حالة الإرجاع.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoanFormValues) => mutation.mutate(data);

  const loansForTabRaw = activeTab === "borrowed" ? borrowedLoans : activeTab === "returned" ? returnedLoans : loans || [];

  const loansForTab = useMemo(() => {
    const q = loansSearch.trim().toLowerCase();
    if (!q) return loansForTabRaw;
    return loansForTabRaw.filter((l) => {
      const patient = (l.admissions?.patient_name ?? "").toLowerCase();
      const uni = (l.unified_number ?? "").toLowerCase();
      const by = (l.borrowed_by ?? "").toLowerCase();
      const dept = (l.borrowed_to_department ?? "").toLowerCase();
      const reason = (l.loan_reason ?? "").toLowerCase();
      return [patient, uni, by, dept, reason].some((v) => v.includes(q));
    });
  }, [loansForTabRaw, loansSearch]);

  const editLoanSchema = useMemo(
    () =>
      z.object({
        borrowed_by: z.string().min(1, "اسم المستعير مطلوب"),
        borrowed_to_department: z.string().min(1, "القسم المستعار إليه مطلوب"),
        loan_reason: z.string().min(1, "سبب الاستعارة مطلوب"),
      }),
    []
  );

  type EditLoanValues = z.infer<typeof editLoanSchema>;
  const editForm = useForm<EditLoanValues>({
    resolver: zodResolver(editLoanSchema),
    defaultValues: { borrowed_by: "", borrowed_to_department: "", loan_reason: "" },
  });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [loanToEdit, setLoanToEdit] = useState<LoanRow | null>(null);

  const openEditDialog = (loan: LoanRow) => {
    setLoanToEdit(loan);
    editForm.reset({
      borrowed_by: loan.borrowed_by ?? "",
      borrowed_to_department: loan.borrowed_to_department ?? "",
      loan_reason: loan.loan_reason ?? "",
    });
    setEditDialogOpen(true);
  };

  const editMutation = useMutation({
    mutationFn: async (params: { loanId: string; values: EditLoanValues }) => {
      await Promise.all([
        ensureLookupValue("borrower", params.values.borrowed_by),
        ensureLookupValue("to_department", params.values.borrowed_to_department),
        ensureLookupValue("reason", params.values.loan_reason),
      ]);

      const { data, error } = await supabase
        .from("file_loans")
        .update({
          borrowed_by: params.values.borrowed_by,
          borrowed_to_department: params.values.borrowed_to_department,
          loan_reason: params.values.loan_reason,
        })
        .eq("id", params.loanId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["file_loans"] });
      setEditDialogOpen(false);
      setLoanToEdit(null);
      toast({ title: "تم التعديل", description: "تم تحديث بيانات الاستعارة." });
    },
    onError: (error: any) => {
      toast({
        title: "تعذر التعديل",
        description: error?.message ?? "حدث خطأ أثناء التعديل.",
        variant: "destructive",
      });
    },
  });

  const openReturnDialog = (loan: LoanRow) => {
    setLoanToReturn(loan);
    setReturnDateLocal(new Date().toISOString().slice(0, 16));
    setReturnDialogOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">الاستعارات</h2>
            <p className="text-muted-foreground">تسجيل وتتبع الملفات المستعارة</p>
          </div>
          <TimeFilter value={timeRange} onChange={setTimeRange} />
        </div>

        {/* Colored Tabs */}
        <div className="sticky top-16 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4">
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            <ColoredStatTab
              title="حالات تم استعارتها"
              value={borrowedLoans.length}
              subtitle="ملفات لم تُرجع بعد"
              icon={FolderOpen}
              color="cyan"
              onClick={() => setActiveTab("borrowed")}
              active={activeTab === "borrowed"}
            />
            <ColoredStatTab
              title="حالات تم رجعوها"
              value={returnedLoans.length}
              subtitle="ملفات أُعيدت"
              icon={FolderCheck}
              color="green"
              onClick={() => setActiveTab("returned")}
              active={activeTab === "returned"}
            />
            <ColoredStatTab
              title="عدد الحالات كلها"
              value={(loans || []).length}
              subtitle="الإجمالي"
              icon={Files}
              color="purple"
              onClick={() => setActiveTab("all")}
              active={activeTab === "all"}
            />
          </div>
        </div>

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
                    <p className="font-semibold">{lastAdmissionInternalNumber ?? "—"}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  {selectedAdmission.admission_status === "محجوز" && (
                    <div className="text-sm font-semibold text-muted-foreground">
                      الحالة محجوزة (لم تخرج بعد)
                    </div>
                  )}
                  {activeLoanInfo && (
                    <div className="rounded-md border border-border bg-muted/30 p-3">
                      <div className="text-sm font-semibold">تم استعارتها</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        المستعير: <span className="font-medium text-foreground">{activeLoanInfo.borrowed_by}</span>
                        {"  "}— القسم: <span className="font-medium text-foreground">{activeLoanInfo.borrowed_to_department}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        السبب: {activeLoanInfo.loan_reason || "—"} — تاريخ الاستعارة: {formatDateTime(activeLoanInfo.loan_date)}
                      </div>
                    </div>
                  )}
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
                            <LoanSuggestInput
                              value={field.value}
                              onValueChange={field.onChange}
                              suggestions={borrowersOptions.map((o) => o.name)}
                              placeholder="اسم الشخص المستعير"
                              listId="loan-borrowers"
                              onAdd={() => {
                                setLoanLookupType("borrower");
                                setLookupInitialName(field.value);
                                setLookupCreateOpen(true);
                              }}
                              onManage={() => {
                                setLoanLookupType("borrower");
                                setLookupManageOpen(true);
                              }}
                            />
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
                            <LoanSuggestInput
                              value={field.value}
                              onValueChange={field.onChange}
                              suggestions={toDeptOptions.map((o) => o.name)}
                              placeholder="القسم المستعار إليه"
                              listId="loan-to-depts"
                              onAdd={() => {
                                setLoanLookupType("to_department");
                                setLookupInitialName(field.value);
                                setLookupCreateOpen(true);
                              }}
                              onManage={() => {
                                setLoanLookupType("to_department");
                                setLookupManageOpen(true);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="loan_reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>سبب الاستعارة *</FormLabel>
                          <FormControl>
                            <LoanSuggestInput
                              value={field.value}
                              onValueChange={field.onChange}
                              suggestions={reasonOptions.map((o) => o.name)}
                              placeholder="سبب الاستعارة"
                              listId="loan-reasons"
                              onAdd={() => {
                                setLoanLookupType("reason");
                                setLookupInitialName(field.value);
                                setLookupCreateOpen(true);
                              }}
                              onManage={() => {
                                setLoanLookupType("reason");
                                setLookupManageOpen(true);
                              }}
                            />
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
            <div className="mb-4">
              <Input
                value={loansSearch}
                onChange={(e) => setLoansSearch(e.target.value)}
                placeholder="بحث (اسم المريض / الرقم الموحد / المستعير / القسم / السبب)..."
              />
            </div>

            {activeTab === "borrowed" && borrowedLoans.length > 0 && (
              <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm text-foreground">
                  تنبيه: يوجد <span className="font-semibold">{borrowedLoans.length}</span> ملف مستعار لم يتم إرجاعه.
                </p>
              </div>
            )}

            <div className="w-full overflow-x-auto">
              <div className="min-w-[1000px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المريض</TableHead>
                      <TableHead className="text-right">الرقم الموحد</TableHead>
                      <TableHead className="text-right">القسم</TableHead>
                      <TableHead className="text-right">المستعير</TableHead>
                      <TableHead className="text-right">سبب الاستعارة</TableHead>
                      <TableHead className="text-right">تاريخ الاستعارة</TableHead>
                      <TableHead className="text-right">تاريخ الإرجاع</TableHead>
                      <TableHead className="text-right">حالة الرجوع</TableHead>
                      <TableHead className="text-right">تعديل</TableHead>
                      <TableHead className="text-right">إرجاع</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loansForTab.length === 0 ? (
                      <TableRow>
                        <TableCell className="text-right text-muted-foreground" colSpan={10}>
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
                          <TableCell className="text-right">{loan.loan_reason || "—"}</TableCell>
                          <TableCell className="text-right">{formatDateTime(loan.loan_date)}</TableCell>
                          <TableCell className="text-right">{formatDateTime(loan.return_date)}</TableCell>
                          <TableCell className="text-right">
                            {loan.is_returned ? (
                              <Badge variant="secondary">تم الإرجاع</Badge>
                            ) : (
                              <Badge variant="destructive">لم يُرجع</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={editMutation.isPending}
                              onClick={() => openEditDialog(loan)}
                            >
                              تعديل
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            {loan.is_returned ? (
                              <span className="text-sm text-muted-foreground">—</span>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={returnMutation.isPending}
                                onClick={() => {
                                  openReturnDialog(loan);
                                }}
                              >
                                تسجيل الإرجاع
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setLoanToEdit(null);
          }}
        >
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>تعديل بيانات الاستعارة</DialogTitle>
              <DialogDescription>تعديل اسم المستعير/القسم/السبب فقط.</DialogDescription>
            </DialogHeader>

            {loanToEdit && (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">المريض</p>
                      <p className="font-semibold">{loanToEdit.admissions?.patient_name ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">الرقم الموحد</p>
                      <p className="font-semibold">{loanToEdit.unified_number}</p>
                    </div>
                  </div>
                </div>

                <Form {...editForm}>
                  <form
                    onSubmit={editForm.handleSubmit((values) => {
                      if (!loanToEdit) return;
                      editMutation.mutate({ loanId: loanToEdit.id, values });
                    })}
                    className="space-y-4"
                  >
                    <FormField
                      control={editForm.control}
                      name="borrowed_by"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>اسم المستعير *</FormLabel>
                          <FormControl>
                            <LoanSuggestInput
                              value={field.value}
                              onValueChange={field.onChange}
                              suggestions={borrowersOptions.map((o) => o.name)}
                              placeholder="اسم الشخص المستعير"
                              listId="loan-borrowers-edit"
                              onAdd={() => {
                                setLoanLookupType("borrower");
                                setLookupInitialName(field.value);
                                setLookupCreateOpen(true);
                              }}
                              onManage={() => {
                                setLoanLookupType("borrower");
                                setLookupManageOpen(true);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="borrowed_to_department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>القسم المستعار إليه *</FormLabel>
                          <FormControl>
                            <LoanSuggestInput
                              value={field.value}
                              onValueChange={field.onChange}
                              suggestions={toDeptOptions.map((o) => o.name)}
                              placeholder="القسم المستعار إليه"
                              listId="loan-to-depts-edit"
                              onAdd={() => {
                                setLoanLookupType("to_department");
                                setLookupInitialName(field.value);
                                setLookupCreateOpen(true);
                              }}
                              onManage={() => {
                                setLoanLookupType("to_department");
                                setLookupManageOpen(true);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="loan_reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>سبب الاستعارة *</FormLabel>
                          <FormControl>
                            <LoanSuggestInput
                              value={field.value}
                              onValueChange={field.onChange}
                              suggestions={reasonOptions.map((o) => o.name)}
                              placeholder="مثال: مراجعة ملف / استكمال بيانات..."
                              listId="loan-reasons-edit"
                              onAdd={() => {
                                setLoanLookupType("reason");
                                setLookupInitialName(field.value);
                                setLookupCreateOpen(true);
                              }}
                              onManage={() => {
                                setLoanLookupType("reason");
                                setLookupManageOpen(true);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter className="gap-2">
                      <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                        إلغاء
                      </Button>
                      <Button type="submit" disabled={editMutation.isPending}>
                        {editMutation.isPending ? "جاري الحفظ..." : "حفظ التعديل"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={returnDialogOpen}
          onOpenChange={(open) => {
            setReturnDialogOpen(open);
            if (!open) setLoanToReturn(null);
          }}
        >
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>تسجيل الإرجاع</DialogTitle>
              <DialogDescription>حدد تاريخ وساعة الإرجاع لتحديث الحالة إلى تم الإرجاع.</DialogDescription>
            </DialogHeader>

            {loanToReturn && (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">المريض</p>
                      <p className="font-semibold">{loanToReturn.admissions?.patient_name ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">الرقم الموحد</p>
                      <p className="font-semibold">{loanToReturn.unified_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">الرقم الداخلي</p>
                      <p className="font-semibold">{loanToReturn.internal_number ?? "—"}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">تاريخ وساعة الإرجاع</label>
                  <Input
                    type="datetime-local"
                    value={returnDateLocal}
                    onChange={(e) => setReturnDateLocal(e.target.value)}
                  />
                  <div className="text-xs text-muted-foreground">سيتم حفظ الحالة: <span className="font-medium">تم الإرجاع</span></div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setReturnDialogOpen(false)}>
                إلغاء
              </Button>
              <Button
                type="button"
                disabled={!loanToReturn || returnMutation.isPending || !returnDateLocal}
                onClick={() => {
                  if (!loanToReturn) return;
                  returnMutation.mutate({ loanId: loanToReturn.id, returnDateLocal });
                }}
              >
                {returnMutation.isPending ? "جاري الحفظ..." : "تم الإرجاع"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Loan Lookups dialogs (Add/Edit list items) */}
        <LoanLookupCreateDialog
          open={lookupCreateOpen}
          type={loanLookupType}
          initialName={lookupInitialName}
          onOpenChange={setLookupCreateOpen}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["loan_borrowers"] });
            queryClient.invalidateQueries({ queryKey: ["loan_to_departments"] });
            queryClient.invalidateQueries({ queryKey: ["loan_reasons"] });
          }}
        />

        <LoanLookupManageDialog
          open={lookupManageOpen}
          type={loanLookupType}
          onOpenChange={setLookupManageOpen}
          items={
            loanLookupType === "borrower"
              ? borrowersOptions
              : loanLookupType === "to_department"
                ? toDeptOptions
                : reasonOptions
          }
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ["loan_borrowers"] });
            queryClient.invalidateQueries({ queryKey: ["loan_to_departments"] });
            queryClient.invalidateQueries({ queryKey: ["loan_reasons"] });
          }}
        />
      </div>
    </Layout>
  );
}
