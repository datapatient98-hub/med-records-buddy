import { useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import ExitHistoryDialog, { type ExitHistoryPayload } from "@/components/ExitHistoryDialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APPROVED_DEPARTMENT_NAMES } from "@/lib/departments/approvedDepartments";
import * as XLSX from "xlsx";

type ProcedureType = "بذل" | "استقبال" | "كلي" | "مناظير";
type DeptFilterType = "entry" | "procedure";

type AppliedFilters = {
  statusFilter: string[];
  deptFilterType: DeptFilterType;
  selectedDepartments: string[];
  doctorId: string | "all";
  diagnosisId: string | "all";
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
};

function ymdToDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getRowDateForTab(tab: string, row: any): Date | null {
  switch (tab) {
    case "admissions_internal":
      return row?.admission_date ? new Date(row.admission_date) : row?.created_at ? new Date(row.created_at) : null;
    case "endoscopies":
      return row?.procedure_date ? new Date(row.procedure_date) : row?.created_at ? new Date(row.created_at) : null;
    case "reception":
    case "dialysis":
    case "paracentesis":
      return row?.procedure_date ? new Date(row.procedure_date) : row?.created_at ? new Date(row.created_at) : null;
    case "loans":
      return row?.loan_date ? new Date(row.loan_date) : row?.created_at ? new Date(row.created_at) : null;
    default:
      return row?.created_at ? new Date(row.created_at) : null;
  }
}

function normalizeForExcel(v: any) {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function Records() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState(
    "admissions_internal" as
      | "admissions_internal"
      | "endoscopies"
      | "reception"
      | "dialysis"
      | "paracentesis"
      | "loans",
  );

  // Header filters (draft + applied)
  const [draftFilters, setDraftFilters] = useState<AppliedFilters>({
    statusFilter: ["reserved", "exited"],
    deptFilterType: "entry",
    selectedDepartments: [],
    doctorId: "all",
    diagnosisId: "all",
    dateFrom: "",
    dateTo: "",
  });
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(draftFilters);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [exitPayload, setExitPayload] = useState<ExitHistoryPayload | null>(null);

  // Fetch admissions
  const { data: admissions, isLoading: admissionsLoading } = useQuery({
    queryKey: ["admissions", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("admissions")
        .select(`
          *,
          department:departments(name),
          governorate:governorates(name),
          district:districts(name),
          diagnosis:diagnoses(name),
          doctor:doctors(name),
          station:stations(name),
          occupation:occupations(name)
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`patient_name.ilike.%${searchTerm}%,unified_number.ilike.%${searchTerm}%,internal_number.eq.${searchTerm}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: doctors } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("doctors").select("id, name").order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: diagnoses } = useQuery({
    queryKey: ["diagnoses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("diagnoses").select("id, name").order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch endoscopies
  const { data: endoscopies, isLoading: endoscopiesLoading } = useQuery({
    queryKey: ["endoscopies", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("endoscopies")
        .select(`
          *,
          department:departments(name),
          governorate:governorates(name),
          district:districts(name),
          diagnosis:diagnoses(name),
          doctor:doctors(name)
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`patient_name.ilike.%${searchTerm}%,unified_number.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch procedures
  const { data: procedures, isLoading: proceduresLoading } = useQuery({
    queryKey: ["procedures", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("procedures")
        .select(`
          *,
          department:departments(name),
          governorate:governorates(name),
          district:districts(name),
          diagnosis:diagnoses(name),
          doctor:doctors(name)
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`patient_name.ilike.%${searchTerm}%,unified_number.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch loans
  const { data: loans, isLoading: loansLoading } = useQuery({
    queryKey: ["loans", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("file_loans")
        .select(`
          *,
          admission:admissions(patient_name)
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`unified_number.ilike.%${searchTerm}%,borrowed_by.ilike.%${searchTerm}%,borrowed_to_department.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const admissionsInternal = useMemo(
    () => ((admissions as any[]) ?? []).filter((a) => (a?.admission_source ?? "داخلي") === "داخلي"),
    [admissions],
  );

  const admissionsInternalIds = useMemo(
    () => admissionsInternal.map((a: any) => a?.id).filter(Boolean) as string[],
    [admissionsInternal],
  );

  const { data: discharges, isLoading: dischargesLoading } = useQuery({
    queryKey: ["discharges-by-admission", admissionsInternalIds],
    enabled: admissionsInternalIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discharges")
        .select("id, admission_id, discharge_date, discharge_status, internal_number")
        .in("admission_id", admissionsInternalIds)
        .order("discharge_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const proceduresOfType = useMemo(() => {
    const list = (procedures as any[]) ?? [];
    return {
      reception: list.filter((p) => (p?.procedure_type as ProcedureType | null) === "استقبال"),
      dialysis: list.filter((p) => (p?.procedure_type as ProcedureType | null) === "كلي"),
      paracentesis: list.filter((p) => (p?.procedure_type as ProcedureType | null) === "بذل"),
    };
  }, [procedures]);

  const loansList = useMemo(() => (loans as any[]) ?? [], [loans]);
  const endoscopiesList = useMemo(() => (endoscopies as any[]) ?? [], [endoscopies]);

  const isDeptSelected = (name: string) => draftFilters.selectedDepartments.includes(name);
  const toggleDept = (name: string, checked: boolean) => {
    setDraftFilters((prev) => {
      const s = new Set(prev.selectedDepartments);
      if (checked) s.add(name);
      else s.delete(name);
      return { ...prev, selectedDepartments: Array.from(s) };
    });
  };

  const deptPredicate = useMemo(() => {
    if (appliedFilters.selectedDepartments.length === 0) return (_row: any) => true;
    const set = new Set(appliedFilters.selectedDepartments);

    return (row: any) => {
      if (appliedFilters.deptFilterType === "entry") {
        const deptName = row?.department?.name ?? row?.department_name ?? "";
        return set.has(deptName);
      }
      // procedure-type filter
      const deptName = row?.department?.name ?? row?.department_name ?? "";
      const loanDept = row?.borrowed_to_department ?? "";
      return set.has(deptName) || set.has(loanDept);
    };
  }, [appliedFilters.deptFilterType, appliedFilters.selectedDepartments]);

  const advancedPredicate = useMemo(() => {
    const from = ymdToDate(appliedFilters.dateFrom);
    const to = ymdToDate(appliedFilters.dateTo);

    return (row: any, tab: string) => {
      // Doctor/Diagnosis (not applicable to loans)
      if (tab !== "loans") {
        if (appliedFilters.doctorId !== "all" && row?.doctor_id !== appliedFilters.doctorId) return false;
        if (appliedFilters.diagnosisId !== "all" && row?.diagnosis_id !== appliedFilters.diagnosisId) return false;
      }

      // Date range (per tab)
      if (from || to) {
        const d = getRowDateForTab(tab, row);
        if (!d) return false;
        if (from && d < from) return false;
        if (to) {
          // include end of day
          const toEnd = new Date(to);
          toEnd.setHours(23, 59, 59, 999);
          if (d > toEnd) return false;
        }
      }

      return true;
    };
  }, [appliedFilters.dateFrom, appliedFilters.dateTo, appliedFilters.diagnosisId, appliedFilters.doctorId]);

  const tabCounts = useMemo(() => {
    return {
      admissions_internal: admissionsInternal.length,
      endoscopies: (endoscopies as any[])?.length ?? 0,
      reception: proceduresOfType.reception.length,
      dialysis: proceduresOfType.dialysis.length,
      paracentesis: proceduresOfType.paracentesis.length,
      loans: (loans as any[])?.length ?? 0,
    };
  }, [admissionsInternal, endoscopies, loans, proceduresOfType]);

  const unifiedExitFlag = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const a of admissionsInternal) {
      if (a?.unified_number) map.set(a.unified_number, false);
    }
    for (const d of (discharges as any[]) ?? []) {
      const admission = admissionsInternal.find((a: any) => a?.id === d.admission_id);
      const un = admission?.unified_number;
      if (un) map.set(un, true);
    }
    for (const p of (procedures as any[]) ?? []) {
      const un = p?.unified_number;
      if (un) map.set(un, true);
    }
    for (const e of (endoscopies as any[]) ?? []) {
      const un = e?.unified_number;
      if (un) map.set(un, true);
    }
    return map;
  }, [admissionsInternal, discharges, endoscopies, procedures]);

  const admissionsInternalFiltered = useMemo(() => {
    const showReserved = appliedFilters.statusFilter.includes("reserved");
    const showExited = appliedFilters.statusFilter.includes("exited");

    return admissionsInternal
      .filter((a: any) => deptPredicate(a))
      .filter((a: any) => advancedPredicate(a, "admissions_internal"))
      .filter((a: any) => {
        const exited = unifiedExitFlag.get(a.unified_number) === true;
        if (exited && showExited) return true;
        if (!exited && showReserved) return true;
        return false;
      });
  }, [admissionsInternal, advancedPredicate, appliedFilters.statusFilter, deptPredicate, unifiedExitFlag]);

  const endoscopiesFiltered = useMemo(
    () => endoscopiesList.filter(deptPredicate).filter((r: any) => advancedPredicate(r, "endoscopies")),
    [advancedPredicate, deptPredicate, endoscopiesList],
  );
  const receptionFiltered = useMemo(
    () => proceduresOfType.reception.filter(deptPredicate).filter((r: any) => advancedPredicate(r, "reception")),
    [advancedPredicate, deptPredicate, proceduresOfType.reception],
  );
  const dialysisFiltered = useMemo(
    () => proceduresOfType.dialysis.filter(deptPredicate).filter((r: any) => advancedPredicate(r, "dialysis")),
    [advancedPredicate, deptPredicate, proceduresOfType.dialysis],
  );
  const paracentesisFiltered = useMemo(
    () => proceduresOfType.paracentesis.filter(deptPredicate).filter((r: any) => advancedPredicate(r, "paracentesis")),
    [advancedPredicate, deptPredicate, proceduresOfType.paracentesis],
  );
  const loansFiltered = useMemo(
    () => loansList.filter(deptPredicate).filter((r: any) => advancedPredicate(r, "loans")),
    [advancedPredicate, deptPredicate, loansList],
  );

  const hasPendingFilterChanges = useMemo(() => {
    return JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters);
  }, [appliedFilters, draftFilters]);

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
  };

  const exportCurrentTabToExcel = () => {
    let rows: any[] = [];
    let sheetName = "records";
    switch (activeTab) {
      case "admissions_internal":
        rows = admissionsInternalFiltered;
        sheetName = "الحجز_الداخلي";
        break;
      case "endoscopies":
        rows = endoscopiesFiltered;
        sheetName = "المناظير";
        break;
      case "reception":
        rows = receptionFiltered;
        sheetName = "الاستقبال";
        break;
      case "dialysis":
        rows = dialysisFiltered;
        sheetName = "الغسيل_الكلوي";
        break;
      case "paracentesis":
        rows = paracentesisFiltered;
        sheetName = "البذل";
        break;
      case "loans":
        rows = loansFiltered;
        sheetName = "الاستعارات";
        break;
      default:
        rows = [];
    }

    const safeRows = rows.map((r) => {
      const out: Record<string, any> = {};
      for (const k of Object.keys(r ?? {})) out[k] = normalizeForExcel(r[k]);
      return out;
    });

    const ws = XLSX.utils.json_to_sheet(safeRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const fileName = `سجل_المرضى_${sheetName}_${format(new Date(), "yyyy-MM-dd_HH-mm")}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const openExitHistory = async (unifiedNumber: string) => {
    const { data: admissionsForUn, error: admErr } = await supabase
      .from("admissions")
      .select("id")
      .eq("unified_number", unifiedNumber);
    if (admErr) throw admErr;

    const admissionIds = (admissionsForUn ?? []).map((a: any) => a.id).filter(Boolean);

    const [disRes, procRes, loansRes] = await Promise.all([
      admissionIds.length
        ? supabase
            .from("discharges")
            .select("*")
            .in("admission_id", admissionIds)
            .order("discharge_date", { ascending: false })
        : Promise.resolve({ data: [], error: null } as any),
      supabase
        .from("procedures")
        .select("*")
        .eq("unified_number", unifiedNumber)
        .order("procedure_date", { ascending: false }),
      supabase
        .from("file_loans")
        .select("*")
        .eq("unified_number", unifiedNumber)
        .order("loan_date", { ascending: false }),
    ]);

    if (disRes.error) throw disRes.error;
    if (procRes.error) throw procRes.error;
    if (loansRes.error) throw loansRes.error;

    setExitPayload({
      unified_number: unifiedNumber,
      discharges: disRes.data ?? [],
      procedures: procRes.data ?? [],
      loans: loansRes.data ?? [],
    });
    setExitOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">سجل المرضى</h1>

            <ToggleGroup
              type="multiple"
              value={draftFilters.statusFilter}
              onValueChange={(v) =>
                setDraftFilters((prev) => ({ ...prev, statusFilter: v.length ? v : ["reserved", "exited"] }))
              }
              className="flex-wrap"
            >
              <ToggleGroupItem
                value="reserved"
                aria-label="محجوز"
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-extrabold text-foreground hover:bg-muted hover:text-foreground data-[state=on]:border-transparent data-[state=on]:bg-status-active data-[state=on]:text-primary-foreground"
              >
                محجوز
              </ToggleGroupItem>
              <ToggleGroupItem
                value="exited"
                aria-label="خروج"
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-extrabold text-foreground hover:bg-muted hover:text-foreground data-[state=on]:border-transparent data-[state=on]:bg-status-discharged data-[state=on]:text-primary-foreground"
              >
                خروج
              </ToggleGroupItem>
            </ToggleGroup>

            <Select
              value={draftFilters.deptFilterType}
              onValueChange={(v) => setDraftFilters((prev) => ({ ...prev, deptFilterType: v as DeptFilterType }))}
            >
              <SelectTrigger className="h-10 w-[180px]">
                <SelectValue placeholder="نوع القسم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry">قسم الدخول</SelectItem>
                <SelectItem value="procedure">قسم الإجراء</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={draftFilters.doctorId}
              onValueChange={(v) => setDraftFilters((prev) => ({ ...prev, doctorId: v as any }))}
            >
              <SelectTrigger className="h-10 w-[190px]">
                <SelectValue placeholder="الطبيب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأطباء</SelectItem>
                {(doctors as any[] | undefined)?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={draftFilters.diagnosisId}
              onValueChange={(v) => setDraftFilters((prev) => ({ ...prev, diagnosisId: v as any }))}
            >
              <SelectTrigger className="h-10 w-[200px]">
                <SelectValue placeholder="التشخيص" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل التشخيصات</SelectItem>
                {(diagnoses as any[] | undefined)?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={draftFilters.dateFrom}
                onChange={(e) => setDraftFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                className="h-10 w-[150px]"
                aria-label="من تاريخ"
              />
              <span className="text-muted-foreground">—</span>
              <Input
                type="date"
                value={draftFilters.dateTo}
                onChange={(e) => setDraftFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                className="h-10 w-[150px]"
                aria-label="إلى تاريخ"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline">
                  الأقسام ({draftFilters.selectedDepartments.length || "الكل"})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                <DropdownMenuLabel>اختيار الأقسام</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={draftFilters.selectedDepartments.length === 0}
                  onCheckedChange={(v) => {
                    if (v) setDraftFilters((prev) => ({ ...prev, selectedDepartments: [] }));
                  }}
                >
                  كل الأقسام
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {APPROVED_DEPARTMENT_NAMES.map((name) => (
                  <DropdownMenuCheckboxItem
                    key={name}
                    checked={isDeptSelected(name)}
                    onCheckedChange={(v) => toggleDept(name, Boolean(v))}
                  >
                    {name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button type="button" onClick={applyFilters} disabled={!hasPendingFilterChanges}>
              تطبيق التصفيات
            </Button>

            <Button type="button" variant="outline" onClick={exportCurrentTabToExcel}>
              تصدير Excel
            </Button>
          </div>
          <Button asChild variant="outline">
            <Link to="/unified-database">قاعدة البيانات الموحدة</Link>
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الرقم الموحد أو الرقم الداخلي..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as any);
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="admissions_internal">الحجز الداخلي ({tabCounts.admissions_internal})</TabsTrigger>
            <TabsTrigger value="endoscopies">المناظير ({tabCounts.endoscopies})</TabsTrigger>
            <TabsTrigger value="reception">الاستقبال ({tabCounts.reception})</TabsTrigger>
            <TabsTrigger value="dialysis">الغسيل الكلوي ({tabCounts.dialysis})</TabsTrigger>
            <TabsTrigger value="paracentesis">البذل ({tabCounts.paracentesis})</TabsTrigger>
            <TabsTrigger value="loans">الاستعارات ({tabCounts.loans})</TabsTrigger>
          </TabsList>

          <TabsContent value="admissions_internal" className="mt-6">
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الرقم الموحد</TableHead>
                      <TableHead>الرقم الداخلي</TableHead>
                      <TableHead>اسم المريض</TableHead>
                      <TableHead>الرقم القومي</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>السن</TableHead>
                      <TableHead>القسم</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التشخيص</TableHead>
                      <TableHead>الطبيب</TableHead>
                      <TableHead>تاريخ الحجز</TableHead>
                      <TableHead>الخروج</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admissionsLoading ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : admissionsInternalFiltered.length > 0 ? (
                      admissionsInternalFiltered.map((admission: any) => (
                        <TableRow key={admission.id}>
                          <TableCell>{admission.unified_number}</TableCell>
                          <TableCell>{admission.internal_number}</TableCell>
                          <TableCell>{admission.patient_name}</TableCell>
                          <TableCell>{admission.national_id}</TableCell>
                          <TableCell>{admission.gender}</TableCell>
                          <TableCell>{admission.age}</TableCell>
                          <TableCell>{admission.department?.name}</TableCell>
                          <TableCell>
                            <span className={`px-3 py-1.5 rounded-md text-sm font-extrabold text-primary-foreground ${
                              admission.admission_status === 'محجوز' ? 'bg-status-active' :
                              admission.admission_status === 'خروج' ? 'bg-status-discharged' :
                              admission.admission_status === 'متوفى' ? 'bg-status-deceased' :
                              'bg-status-pending'
                            }`}>
                              {admission.admission_status}
                            </span>
                          </TableCell>
                          <TableCell>{admission.diagnosis?.name || '-'}</TableCell>
                          <TableCell>{admission.doctor?.name || '-'}</TableCell>
                          <TableCell>{format(new Date(admission.admission_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openExitHistory(admission.unified_number)}
                            >
                              عرض سجل الخروج
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center text-muted-foreground">لا توجد بيانات</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="endoscopies" className="mt-6">
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الرقم الموحد</TableHead>
                      <TableHead>اسم المريض</TableHead>
                      <TableHead>الرقم القومي</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>السن</TableHead>
                      <TableHead>القسم</TableHead>
                      <TableHead>التشخيص</TableHead>
                      <TableHead>الطبيب</TableHead>
                      <TableHead>تاريخ الإجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {endoscopiesLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : endoscopiesFiltered.length > 0 ? (
                      endoscopiesFiltered.map((endoscopy: any) => (
                        <TableRow key={endoscopy.id}>
                          <TableCell>{endoscopy.unified_number}</TableCell>
                          <TableCell>{endoscopy.patient_name}</TableCell>
                          <TableCell>{endoscopy.national_id}</TableCell>
                          <TableCell>{endoscopy.gender}</TableCell>
                          <TableCell>{endoscopy.age}</TableCell>
                          <TableCell>{endoscopy.department?.name}</TableCell>
                          <TableCell>{endoscopy.diagnosis?.name || '-'}</TableCell>
                          <TableCell>{endoscopy.doctor?.name || '-'}</TableCell>
                          <TableCell>{format(new Date(endoscopy.procedure_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">لا توجد بيانات</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reception" className="mt-6">
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الرقم الموحد</TableHead>
                      <TableHead>اسم المريض</TableHead>
                      <TableHead>الرقم القومي</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>السن</TableHead>
                      <TableHead>القسم</TableHead>
                      <TableHead>التشخيص</TableHead>
                      <TableHead>الطبيب</TableHead>
                      <TableHead>تاريخ الإجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proceduresLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : receptionFiltered.length > 0 ? (
                      receptionFiltered.map((procedure: any) => (
                        <TableRow key={procedure.id}>
                          <TableCell>{procedure.unified_number}</TableCell>
                          <TableCell>{procedure.patient_name}</TableCell>
                          <TableCell>{procedure.national_id}</TableCell>
                          <TableCell>{procedure.gender}</TableCell>
                          <TableCell>{procedure.age}</TableCell>
                          <TableCell>{procedure.department?.name}</TableCell>
                          <TableCell>{procedure.diagnosis?.name || '-'}</TableCell>
                          <TableCell>{procedure.doctor?.name || '-'}</TableCell>
                          <TableCell>{format(new Date(procedure.procedure_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">لا توجد بيانات</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dialysis" className="mt-6">
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الرقم الموحد</TableHead>
                      <TableHead>اسم المريض</TableHead>
                      <TableHead>الرقم القومي</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>السن</TableHead>
                      <TableHead>القسم</TableHead>
                      <TableHead>التشخيص</TableHead>
                      <TableHead>الطبيب</TableHead>
                      <TableHead>تاريخ الإجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proceduresLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : dialysisFiltered.length > 0 ? (
                      dialysisFiltered.map((procedure: any) => (
                        <TableRow key={procedure.id}>
                          <TableCell>{procedure.unified_number}</TableCell>
                          <TableCell>{procedure.patient_name}</TableCell>
                          <TableCell>{procedure.national_id}</TableCell>
                          <TableCell>{procedure.gender}</TableCell>
                          <TableCell>{procedure.age}</TableCell>
                          <TableCell>{procedure.department?.name}</TableCell>
                          <TableCell>{procedure.diagnosis?.name || "-"}</TableCell>
                          <TableCell>{procedure.doctor?.name || "-"}</TableCell>
                          <TableCell>{format(new Date(procedure.procedure_date), "dd/MM/yyyy HH:mm")}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">لا توجد بيانات</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="paracentesis" className="mt-6">
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الرقم الموحد</TableHead>
                      <TableHead>اسم المريض</TableHead>
                      <TableHead>الرقم القومي</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>السن</TableHead>
                      <TableHead>القسم</TableHead>
                      <TableHead>التشخيص</TableHead>
                      <TableHead>الطبيب</TableHead>
                      <TableHead>تاريخ الإجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proceduresLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : paracentesisFiltered.length > 0 ? (
                      paracentesisFiltered.map((procedure: any) => (
                        <TableRow key={procedure.id}>
                          <TableCell>{procedure.unified_number}</TableCell>
                          <TableCell>{procedure.patient_name}</TableCell>
                          <TableCell>{procedure.national_id}</TableCell>
                          <TableCell>{procedure.gender}</TableCell>
                          <TableCell>{procedure.age}</TableCell>
                          <TableCell>{procedure.department?.name}</TableCell>
                          <TableCell>{procedure.diagnosis?.name || "-"}</TableCell>
                          <TableCell>{procedure.doctor?.name || "-"}</TableCell>
                          <TableCell>{format(new Date(procedure.procedure_date), "dd/MM/yyyy HH:mm")}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">لا توجد بيانات</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="loans" className="mt-6">
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الرقم الموحد</TableHead>
                      <TableHead>الرقم الداخلي</TableHead>
                      <TableHead>اسم المريض</TableHead>
                      <TableHead>المستعار</TableHead>
                      <TableHead>القسم المستعار إليه</TableHead>
                      <TableHead>تاريخ الاستعارة</TableHead>
                      <TableHead>تاريخ الإرجاع</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loansLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : loansFiltered.length > 0 ? (
                      loansFiltered.map((loan: any) => (
                        <TableRow key={loan.id}>
                          <TableCell>{loan.unified_number}</TableCell>
                          <TableCell>{loan.internal_number}</TableCell>
                          <TableCell>{loan.admission?.patient_name}</TableCell>
                          <TableCell>{loan.borrowed_by}</TableCell>
                          <TableCell>{loan.borrowed_to_department}</TableCell>
                          <TableCell>{format(new Date(loan.loan_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                          <TableCell>{loan.return_date ? format(new Date(loan.return_date), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium text-primary-foreground ${
                              loan.is_returned ? 'bg-status-discharged' : 'bg-status-pending'
                            }`}>
                              {loan.is_returned ? 'تم الإرجاع' : 'مستعار'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">لا توجد بيانات</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div ref={bottomRef} />

        <div className="sticky bottom-0 z-10 border-t bg-background/80 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-2 flex items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">تنقل سريع</div>
            <Button
              type="button"
              variant="outline"
              onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })}
            >
              اذهب لآخر الصفحة
            </Button>
          </div>
        </div>
      </div>

      <ExitHistoryDialog open={exitOpen} onOpenChange={setExitOpen} payload={exitPayload} />
    </Layout>
  );
}