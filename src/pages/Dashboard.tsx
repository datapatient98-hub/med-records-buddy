import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import DashboardCard from "@/components/DashboardCard";
import KPICard from "@/components/KPICard";
import LoanAlertNotification from "@/components/LoanAlertNotification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DateRangeValue } from "@/components/dashboard/DashboardDateRangeFilter";
import DashboardProfessionalDateRangeCard, {
  type PeriodType,
} from "@/components/dashboard/DashboardProfessionalDateRangeCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import DashboardExportDialog from "@/components/DashboardExportDialog";
import DashboardExportForm from "@/components/DashboardExportForm";
import DashboardAlertBar, {
  type DashboardAlertItem,
} from "@/components/dashboard/DashboardAlertBar";
import DashboardAuditSummary from "@/components/dashboard/DashboardAuditSummary";
import DashboardQualityScorecard from "@/components/dashboard/DashboardQualityScorecard";
import {
  TrendingUp,
  FileDown,
  FileSpreadsheet,
  Activity,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  Microscope,
  Syringe,
  Building2,
  FileText,
  FileX,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  format,
  subDays,
  startOfWeek,
  startOfMonth,
  startOfYear,
  differenceInCalendarDays,
} from "date-fns";

const COLORS = {
  primary: "hsl(var(--chart-1))",
  cyan: "hsl(var(--chart-1))",
  pink: "hsl(var(--chart-5))",
  green: "hsl(var(--chart-2))",
  purple: "hsl(var(--chart-4))",
  orange: "hsl(var(--chart-3))",
};

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<PeriodType>("month");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);

  const [dateRangeValue, setDateRangeValue] = useState<DateRangeValue>(() => {
    const now = new Date();
    const start = startOfMonth(now);
    return {
      from: format(start, "yyyy-MM-dd"),
      to: format(now, "yyyy-MM-dd"),
    };
  });
  
  // Chart visibility toggles - merged procedures (بذل) into emergencies
  const [visibleSeries, setVisibleSeries] = useState({
    admissions: true,
    discharges: true,
    emergencies: true,
    endoscopies: true,
    unreturned_loans: true,
  });

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case "today":
        return { start: format(now, "yyyy-MM-dd"), label: "اليوم" };
      case "week":
        return { start: format(startOfWeek(now), "yyyy-MM-dd"), label: "هذا الأسبوع" };
      case "month":
        return { start: format(startOfMonth(now), "yyyy-MM-dd"), label: "هذا الشهر" };
      case "quarter":
        return { start: format(subDays(now, 90), "yyyy-MM-dd"), label: "آخر 3 أشهر" };
      case "year":
        return { start: format(startOfYear(now), "yyyy-MM-dd"), label: "هذا العام" };
      default:
        return { start: format(startOfMonth(now), "yyyy-MM-dd"), label: "هذا الشهر" };
    }
  };

  const dateRange = getDateRange();
  const rangeEnd = dateRangeValue.to;
  const rangeStart = dateRangeValue.from;

  // Sync the quick buttons with the custom range (date-only) to keep UX consistent.
  // Any time the user clicks a quick period, we update the from/to.
  useEffect(() => {
    const now = new Date();
    setDateRangeValue((prev) => ({
      ...prev,
      from: dateRange.start,
      to: format(now, "yyyy-MM-dd"),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const isWithinRange = (raw: unknown) => {
    if (!raw) return false;
    const t = new Date(String(raw)).getTime();
    if (Number.isNaN(t)) return false;
    const startT = new Date(rangeStart).getTime();
    const endT = new Date(rangeEnd).getTime() + 24 * 60 * 60 * 1000 - 1; // end-of-day
    return t >= startT && t <= endT;
  };

  useEffect(() => {
    if (!autoRefresh) return;
    const t = window.setInterval(() => {
      // Avoid spamming: just invalidate; react-query will refetch active queries.
      queryClient.invalidateQueries({
        predicate: (q) => {
          const key0 = Array.isArray(q.queryKey) ? (q.queryKey[0] as string) : "";
          return (
            key0 === "admissions-period" ||
            key0 === "discharges-period" ||
            key0 === "emergencies-period" ||
            key0 === "endoscopies-period" ||
            key0 === "procedures-period" ||
            key0 === "active-admissions" ||
            key0 === "departments" ||
            key0 === "loans-period" ||
            key0 === "unreturned-loans" ||
            key0 === "previous-admissions" ||
            key0 === "previous-discharges"
          );
        },
      });
    }, 30_000);

    return () => window.clearInterval(t);
  }, [autoRefresh, queryClient]);

  // Fetch all data
  const { data: admissionsData } = useQuery({
    queryKey: ["admissions-period", rangeStart, rangeEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("admissions")
        .select(
          "id, department_id, admission_date, patient_name, unified_number, national_id, phone, address_details"
        )
        .gte("admission_date", rangeStart)
        .lte("admission_date", rangeEnd);
      return data || [];
    },
  });

  const { data: dischargesData } = useQuery({
    queryKey: ["discharges-period", rangeStart, rangeEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("discharges")
        .select(
          "id, admission_id, discharge_date, discharge_department_id, discharge_status, created_at, admissions(id, admission_date, department_id, unified_number)"
        )
        .gte("discharge_date", rangeStart)
        .lte("discharge_date", rangeEnd);
      return data || [];
    },
  });

  const { data: emergenciesData } = useQuery({
    queryKey: ["emergencies-period", rangeStart, rangeEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("emergencies")
        .select("id, visit_date")
        .gte("visit_date", rangeStart)
        .lte("visit_date", rangeEnd);
      return data || [];
    },
  });

  const { data: endoscopiesData } = useQuery({
    queryKey: ["endoscopies-period", rangeStart, rangeEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("endoscopies")
        .select("id, procedure_date, discharge_status, discharge_status_other")
        .gte("procedure_date", rangeStart)
        .lte("procedure_date", rangeEnd);
      return data || [];
    },
  });

  const { data: proceduresData } = useQuery({
    queryKey: ["procedures-period", rangeStart, rangeEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("procedures")
        .select("id, procedure_date, procedure_type")
        .gte("procedure_date", rangeStart)
        .lte("procedure_date", rangeEnd);
      return data || [];
    },
  });

  const { data: activeAdmissions } = useQuery({
    queryKey: ["active-admissions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admissions")
        .select("id, department_id")
        .eq("admission_status", "محجوز");
      return data || [];
    },
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*");
      return data || [];
    },
  });

  // Fetch loans data
  const { data: loansData } = useQuery({
    queryKey: ["loans-period", rangeStart, rangeEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("file_loans")
        .select("id, is_returned, loan_date")
        .gte("loan_date", rangeStart)
        .lte("loan_date", rangeEnd);
      return data || [];
    },
  });

  const { data: unreturnedLoans } = useQuery({
    queryKey: ["unreturned-loans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("file_loans")
        .select("id")
        .eq("is_returned", false);
      return data || [];
    },
  });

  const { data: admissionsAudit } = useQuery({
    queryKey: ["admissions-audit", rangeStart, rangeEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("admissions_audit")
        .select("id, changed_at, changed_fields")
        .gte("changed_at", rangeStart)
        .lte("changed_at", rangeEnd)
        .order("changed_at", { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  // Calculate stats
  // Only count COMPLETED visits inside the same period:
  // - must be linked by admission_id
  // - admission_date AND discharge_date must both be within the selected range
  const completedDischarges = (dischargesData ?? []).filter((d: any) => {
    if (!d?.admission_id) return false;
    if (!d?.admissions?.admission_date) return false;
    return isWithinRange(d.admissions.admission_date) && isWithinRange(d.discharge_date);
  });

  const totalAdmissions = completedDischarges.length;
  const totalDischarges = completedDischarges.length;

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayAdmissions = completedDischarges.filter(
    (d: any) => format(new Date(d.admissions?.admission_date || ""), "yyyy-MM-dd") === todayStr
  ).length;
  const weekAdmissions = completedDischarges.filter(
    (d: any) => new Date(d.admissions?.admission_date || "") >= startOfWeek(new Date())
  ).length;

  const todayDischarges = completedDischarges.filter(
    (d: any) => format(new Date(d.discharge_date || ""), "yyyy-MM-dd") === todayStr
  ).length;
  const weekDischarges = completedDischarges.filter(
    (d: any) => new Date(d.discharge_date || "") >= startOfWeek(new Date())
  ).length;

  const normalizeOutcome = (raw: unknown) => {
    const s = String(raw ?? "").trim();
    return s || "غير محدد";
  };

  const endoscopyOutcomeRows = (endoscopiesData ?? [])
    .map((r: any) => normalizeOutcome(r?.discharge_status_other || r?.discharge_status))
    .filter((s) => s !== "غير محدد");

  const dischargeOutcomeRows = (dischargesData ?? []).map((d: any) => normalizeOutcome(d?.discharge_status));

  const outcomesAll = [...dischargeOutcomeRows, ...endoscopyOutcomeRows];
  const outcomesAllByStatus = outcomesAll.reduce((acc: Record<string, number>, s) => {
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const countOutcomeAll = (s: string) => outcomesAllByStatus[s] || 0;

  // KPI: الوفاة من كل المصادر (الخروج + المناظير)
  const deathCases = countOutcomeAll("وفاة");
  
  const totalEmergencies = emergenciesData?.length || 0;
  const todayEmergencies =
    emergenciesData?.filter(
      (e: any) =>
        format(new Date(e.visit_date || ""), "yyyy-MM-dd") ===
        format(new Date(), "yyyy-MM-dd")
    ).length || 0;
  const weekEmergencies =
    emergenciesData?.filter(
      (e: any) => new Date(e.visit_date || "") >= startOfWeek(new Date())
    ).length || 0;

  const totalEndoscopies = endoscopiesData?.length || 0;
  const todayEndoscopies =
    endoscopiesData?.filter(
      (e: any) =>
        format(new Date(e.procedure_date || ""), "yyyy-MM-dd") ===
        format(new Date(), "yyyy-MM-dd")
    ).length || 0;
  const weekEndoscopies =
    endoscopiesData?.filter(
      (e: any) => new Date(e.procedure_date || "") >= startOfWeek(new Date())
    ).length || 0;

  const totalProcedures = proceduresData?.length || 0;
  // More accurate breakdowns
  const dischargeByStatus = (dischargesData ?? []).reduce(
    (acc: Record<string, number>, d: any) => {
      const status = String(d?.discharge_status || "غير محدد").trim() || "غير محدد";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {}
  );

  const countDischargeStatus = (status: string) => dischargeByStatus[status] || 0;

  const proceduresByType = (proceduresData ?? []).reduce(
    (acc: Record<string, number>, p: any) => {
      const t = String(p?.procedure_type || "غير محدد").trim() || "غير محدد";
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    },
    {}
  );

  const countProcedureType = (t: string) => proceduresByType[t] || 0;

  const todayProcedures =
    proceduresData?.filter(
      (p: any) =>
        format(new Date(p.procedure_date || ""), "yyyy-MM-dd") ===
        format(new Date(), "yyyy-MM-dd")
    ).length || 0;
  const weekProcedures =
    proceduresData?.filter(
      (p: any) => new Date(p.procedure_date || "") >= startOfWeek(new Date())
    ).length || 0;

  // Loan stats (needed for alerts + KPI cards)
  const totalLoans = loansData?.length || 0;
  const unreturnedCount = unreturnedLoans?.length || 0;

  // Safety + Quality + Audit (derived)
  const admissionsInPeriod = admissionsData ?? [];
  const countTotalAdmissions = admissionsInPeriod.length;

  const invalidNationalIdCount = admissionsInPeriod.filter((a: any) => {
    const nat = String(a.national_id || "").replace(/\D/g, "");
    return nat.length > 0 && nat.length !== 14;
  }).length;
  const invalidPhoneCount = admissionsInPeriod.filter((a: any) => {
    const ph = String(a.phone || "").replace(/\D/g, "");
    return ph.length > 0 && ph.length !== 11;
  }).length;
  const nonQuadNameCount = admissionsInPeriod.filter((a: any) => {
    const name = String(a.patient_name || "").trim();
    if (!name) return true;
    return name.split(/\s+/).filter(Boolean).length < 4;
  }).length;
  const missingAddressCount = admissionsInPeriod.filter(
    (a: any) => !String(a.address_details || "").trim()
  ).length;

  const makeDuplicatesCount = (key: "national_id" | "phone") => {
    const m = new Map<string, number>();
    for (const a of admissionsInPeriod as any[]) {
      const raw = String((a as any)[key] || "").replace(/\D/g, "");
      if (!raw) continue;
      m.set(raw, (m.get(raw) || 0) + 1);
    }
    return Array.from(m.values()).reduce((acc, v) => acc + (v > 1 ? v : 0), 0);
  };

  const duplicatedNationalIdRows = makeDuplicatesCount("national_id");
  const duplicatedPhoneRows = makeDuplicatesCount("phone");

  const alerts: DashboardAlertItem[] = [
    {
      id: "dup_nat",
      title: "تنبيه: تكرار الرقم القومي",
      description:
        duplicatedNationalIdRows > 0
          ? `يوجد ${duplicatedNationalIdRows} سجل/سجلات داخل الفترة تحمل رقم قومي مكرر.`
          : "",
      severity: "warn",
    },
    {
      id: "dup_phone",
      title: "تنبيه: تكرار رقم الهاتف",
      description:
        duplicatedPhoneRows > 0
          ? `يوجد ${duplicatedPhoneRows} سجل/سجلات داخل الفترة تحمل رقم هاتف مكرر.`
          : "",
      severity: "warn",
    },
    {
      id: "unreturned_loans",
      title: "تنبيه: ملفات لم تُرجع",
      description:
        unreturnedCount > 0 ? `يوجد ${unreturnedCount} ملف/ملفات لم تُرجع حتى الآن.` : "",
      severity: unreturnedCount > 0 ? "error" : "info",
    },
  ];

  const qualityScores = [
    {
      label: "الاسم رباعي",
      percent:
        countTotalAdmissions > 0
          ? ((countTotalAdmissions - nonQuadNameCount) / countTotalAdmissions) * 100
          : 0,
      countBad: nonQuadNameCount,
      countTotal: countTotalAdmissions,
    },
    {
      label: "الرقم القومي صحيح",
      percent:
        countTotalAdmissions > 0
          ? ((countTotalAdmissions - invalidNationalIdCount) / countTotalAdmissions) * 100
          : 0,
      countBad: invalidNationalIdCount,
      countTotal: countTotalAdmissions,
    },
    {
      label: "الهاتف صحيح",
      percent:
        countTotalAdmissions > 0
          ? ((countTotalAdmissions - invalidPhoneCount) / countTotalAdmissions) * 100
          : 0,
      countBad: invalidPhoneCount,
      countTotal: countTotalAdmissions,
    },
    {
      label: "العنوان مكتمل",
      percent:
        countTotalAdmissions > 0
          ? ((countTotalAdmissions - missingAddressCount) / countTotalAdmissions) * 100
          : 0,
      countBad: missingAddressCount,
      countTotal: countTotalAdmissions,
    },
  ];

  const topIssues = [
    { id: "name", label: "الاسم غير رباعي/فارغ", count: nonQuadNameCount },
    { id: "nat", label: "الرقم القومي غير صحيح", count: invalidNationalIdCount },
    { id: "phone", label: "رقم الهاتف غير صحيح", count: invalidPhoneCount },
    { id: "addr", label: "العنوان ناقص", count: missingAddressCount },
  ]
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  const auditFieldCounts = new Map<string, number>();
  for (const row of (admissionsAudit ?? []) as any[]) {
    const changedFields = row?.changed_fields;
    if (!changedFields || typeof changedFields !== "object") continue;
    for (const k of Object.keys(changedFields)) {
      auditFieldCounts.set(k, (auditFieldCounts.get(k) || 0) + 1);
    }
  }
  const auditTopFields = Array.from(auditFieldCounts.entries())
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const auditSummary = {
    totalChanges: (admissionsAudit ?? []).length,
    topFields: auditTopFields,
  };

  // Department stats
  const departmentStats = departments?.map((dept) => {
    // Completed (entry-based)
    const deptAdmissions = completedDischarges.filter(
      (d: any) => d.admissions?.department_id === dept.id
    ).length;

    // Completed (exit-based)
    const deptDischarges = completedDischarges.filter(
      (d: any) => d.discharge_department_id === dept.id
    ).length;

    // إجمالي الزيارات للقسم (بدون تكرار):
    // - لو نفس الزيارة قسم الدخول = قسم الخروج، تتحسب مرة واحدة فقط.
    // - لو الزيارة دخلت من قسم وخرجت من قسم مختلف، تظهر كزيارة ضمن كل قسم على حدة.
    const deptTotalVisits = new Set(
      completedDischarges
        .filter(
          (d: any) =>
            d?.admission_id &&
            (d.admissions?.department_id === dept.id ||
              d.discharge_department_id === dept.id)
        )
        .map((d: any) => String(d.admission_id))
    ).size;

    const deptActive = activeAdmissions?.filter((a) => a.department_id === dept.id).length || 0;

    return {
      name: dept.name,
      admissions: deptAdmissions,
      discharges: deptDischarges,
      active: deptActive,
      totalCases: deptTotalVisits,
    };
  }) || [];

  // Combined emergencies + procedures (البذل مدمج مع الطوارئ)
  const combinedEmergencies = (emergenciesData?.length || 0) + (proceduresData?.length || 0);
  const todayCombinedEmergencies = todayEmergencies + todayProcedures;
  const weekCombinedEmergencies = weekEmergencies + weekProcedures;

  // KPI calculations for previous period (for comparison)
  const { data: previousAdmissions } = useQuery({
    queryKey: ["previous-admissions", rangeStart, rangeEnd],
    queryFn: async () => {
      const periodDays = Math.max(1, differenceInCalendarDays(new Date(rangeEnd), new Date(rangeStart)) + 1);
      const startDate = new Date(rangeStart);
      startDate.setDate(startDate.getDate() - periodDays);
      const endDate = new Date(rangeEnd);
      endDate.setDate(endDate.getDate() - periodDays);
      
      const { data } = await supabase
        .from("admissions")
        .select("id")
        .gte("admission_date", format(startDate, "yyyy-MM-dd"))
        .lte("admission_date", format(endDate, "yyyy-MM-dd"));
      return data || [];
    },
  });

  const { data: previousDischarges } = useQuery({
    queryKey: ["previous-discharges", rangeStart, rangeEnd],
    queryFn: async () => {
      const periodDays = Math.max(1, differenceInCalendarDays(new Date(rangeEnd), new Date(rangeStart)) + 1);
      const startDate = new Date(rangeStart);
      startDate.setDate(startDate.getDate() - periodDays);
      const endDate = new Date(rangeEnd);
      endDate.setDate(endDate.getDate() - periodDays);
      
      const { data } = await supabase
        .from("discharges")
        .select("id, discharge_status")
        .gte("discharge_date", format(startDate, "yyyy-MM-dd"))
        .lte("discharge_date", format(endDate, "yyyy-MM-dd"));
      return data || [];
    },
  });

  // Monthly data for interactive chart - merged procedures into emergencies
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const admissionsCount = completedDischarges.filter(
      (d: any) => new Date(d.admissions?.admission_date || "").getMonth() === i
    ).length;
    const dischargesCount = completedDischarges.filter(
      (d: any) => new Date(d.discharge_date || "").getMonth() === i
    ).length;
    const emergenciesCount = emergenciesData?.filter((e: any) => new Date(e.visit_date || '').getMonth() === i).length || 0;
    const proceduresCount = proceduresData?.filter((p: any) => new Date(p.procedure_date || '').getMonth() === i).length || 0;
    const endoscopiesCount = endoscopiesData?.filter((e: any) => new Date(e.procedure_date || '').getMonth() === i).length || 0;
    const loansCount = loansData?.filter((l: any) => new Date(l.loan_date || '').getMonth() === i).length || 0;
    const unreturnedLoansCount = loansData?.filter((l: any) => 
      new Date(l.loan_date || '').getMonth() === i && !l.is_returned
    ).length || 0;
    
    return {
      month: `${(i + 1).toString().padStart(2, '0')}`,
      monthName: new Date(2024, i, 1).toLocaleDateString('ar', { month: 'short' }),
      admissions: admissionsCount,
      discharges: dischargesCount,
      emergencies: emergenciesCount + proceduresCount, // Combined
      endoscopies: endoscopiesCount,
      unreturned_loans: unreturnedLoansCount,
    };
  });

  // Export is handled via DashboardExportDialog (dropdown in header)

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with Export Controls */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground">لوحة التحكم</h2>
            <p className="text-muted-foreground">
              نظرة شاملة على البيانات — {rangeStart} → {rangeEnd}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries();
              }}
            >
              تحديث الأرقام
            </Button>

            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh((v) => !v)}
            >
              {autoRefresh ? "إيقاف التحديث التلقائي" : "تشغيل التحديث التلقائي"}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileSpreadsheet className="ml-2 h-4 w-4" />
                  تصدير
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-[220px] bg-popover text-popover-foreground shadow-md border z-50"
              >
                <DropdownMenuItem onSelect={() => setExportOpen(true)}>
                  <FileDown className="ml-2 h-4 w-4" />
                  تصدير Excel (يوم محدد)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

        {/* Export Panel (top) */}
        <Card id="dashboard-export-panel" className="bg-card/50 backdrop-blur border-r-4 border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <FileSpreadsheet className="h-5 w-5" />
              تصدير بيانات لوحة التحكم
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              اختر اليوم/الفترة والأنواع المطلوبة لتصدير ملف Excel (ملخص + تفاصيل) بعناوين عربية.
            </p>
          </CardHeader>
          <CardContent>
            <DashboardExportForm compact />
          </CardContent>
        </Card>

        {/* Date Range (professional, under export) */}
        <DashboardProfessionalDateRangeCard
          value={dateRangeValue}
          onChange={(next) => setDateRangeValue(next)}
          period={period}
          onPeriodChange={setPeriod}
        />

        {/* Global Outcomes Summary (Discharges + Endoscopies) */}
        <Card className="border-border bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Activity className="h-5 w-5 text-primary" />
              ملخص النتائج (الخروج + المناظير)
            </CardTitle>
            <p className="text-sm text-muted-foreground">تحسن / تحويل / هروب / وفاة داخل الفترة المختارة.</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">تحسن</span>
                <span className="text-lg font-semibold text-foreground">{countOutcomeAll("تحسن")}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">حسب الطلب</span>
                <span className="text-lg font-semibold text-foreground">{countOutcomeAll("حسب الطلب")}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">هروب</span>
                <span className="text-lg font-semibold text-foreground">{countOutcomeAll("هروب")}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">تحويل</span>
                <span className="text-lg font-semibold text-foreground">{countOutcomeAll("تحويل")}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 lg:col-span-4">
                <span className="text-sm text-muted-foreground">وفاة</span>
                <span className="text-lg font-semibold text-foreground">{countOutcomeAll("وفاة")}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <DashboardAlertBar items={alerts} />

        <div className="grid gap-4 md:grid-cols-2">
          <DashboardQualityScorecard scores={qualityScores} topIssues={topIssues} />
          <DashboardAuditSummary summary={auditSummary} />
        </div>

       <DashboardExportDialog open={exportOpen} onOpenChange={setExportOpen} />

      {/* Priority Stats - Deaths, Active, Emergencies, Unreturned Loans */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-destructive/80 to-destructive overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-4 left-4 w-32 h-32 bg-white rounded-full blur-3xl" />
          </div>
          <CardContent className="p-6 text-white relative z-10">
            <div className="flex items-center justify-between mb-4">
              <UserX className="h-10 w-10 opacity-90" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium opacity-90">حالات الوفاة</h3>
              <p className="text-4xl font-bold">{deathCases}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-green/80 to-green overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-4 right-4 w-32 h-32 bg-white rounded-full blur-3xl" />
          </div>
          <CardContent className="p-6 text-white relative z-10">
            <div className="flex items-center justify-between mb-4">
              <UserCheck className="h-10 w-10 opacity-90" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium opacity-90">الحالات النشطة (محجوز)</h3>
              <p className="text-4xl font-bold">{activeAdmissions?.length || 0}</p>
            </div>
          </CardContent>
        </Card>

        {/* Emergencies + Procedures Combined */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-orange/80 to-orange overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute bottom-4 right-4 w-24 h-24 bg-white rounded-full blur-2xl" />
          </div>
          <CardContent className="p-6 text-white relative z-10">
            <div className="flex items-center justify-between mb-4">
              <AlertTriangle className="h-10 w-10 opacity-90" />
            </div>
            <div className="space-y-1 mb-4">
              <h3 className="text-sm font-medium opacity-90">الطوارئ + البذل</h3>
              <p className="text-4xl font-bold">{combinedEmergencies}</p>
            </div>
            <div className="flex gap-4 pt-4 border-t border-white/20">
              <div className="flex-1">
                <p className="text-xs opacity-80">اليوم</p>
                <p className="text-lg font-semibold">{todayCombinedEmergencies}</p>
              </div>
              <div className="flex-1">
                <p className="text-xs opacity-80">الأسبوع</p>
                <p className="text-lg font-semibold">{weekCombinedEmergencies}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unreturned Loans Stats */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-purple/80 to-purple overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-4 left-4 w-32 h-32 bg-white rounded-full blur-3xl" />
          </div>
          <CardContent className="p-6 text-white relative z-10">
            <div className="flex items-center justify-between mb-4">
              <FileX className="h-10 w-10 opacity-90" />
            </div>
            <div className="space-y-1 mb-4">
              <h3 className="text-sm font-medium opacity-90">ملفات لم تُرجع</h3>
              <p className="text-4xl font-bold">{unreturnedCount}</p>
            </div>
            <div className="flex gap-4 pt-4 border-t border-white/20">
              <div className="flex-1">
                <p className="text-xs opacity-80">الإجمالي</p>
                <p className="text-lg font-semibold">{totalLoans}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="الدخول (الداخلي)"
          value={totalAdmissions}
          icon={Users}
          color="cyan"
          stats={[
            { label: "اليوم", value: todayAdmissions },
            { label: "الأسبوع", value: weekAdmissions },
          ]}
        />

        <DashboardCard
          title="الخروج"
          value={totalDischarges}
          icon={Activity}
          color="pink"
          stats={[
            { label: "اليوم", value: todayDischarges },
            { label: "الأسبوع", value: weekDischarges },
          ]}
        />

        <DashboardCard
          title="المناظير"
          value={totalEndoscopies}
          icon={Microscope}
          color="purple"
          stats={[
            { label: "اليوم", value: todayEndoscopies },
            { label: "الأسبوع", value: weekEndoscopies },
          ]}
        />
      </div>

      {/* Detailed Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-lg border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <FileText className="h-5 w-5 text-primary" />
              تفصيل الخروج حسب الحالة
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              محسوب حسب تاريخ الخروج داخل الفترة (بدون شرط تاريخ الدخول).
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">تحسن</span>
                <span className="text-lg font-semibold text-foreground">{countDischargeStatus("تحسن")}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">تحويل</span>
                <span className="text-lg font-semibold text-foreground">{countDischargeStatus("تحويل")}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">هروب</span>
                <span className="text-lg font-semibold text-foreground">{countDischargeStatus("هروب")}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">وفاة</span>
                <span className="text-lg font-semibold text-foreground">{countDischargeStatus("وفاة")}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Syringe className="h-5 w-5 text-primary" />
              تفصيل الإجراءات حسب النوع
            </CardTitle>
            <p className="text-sm text-muted-foreground">محسوب حسب تاريخ الإجراء داخل الفترة.</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">بذل</span>
                <span className="text-lg font-semibold text-foreground">{countProcedureType("بذل")}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">استقبال</span>
                <span className="text-lg font-semibold text-foreground">{countProcedureType("استقبال")}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">كلي</span>
                <span className="text-lg font-semibold text-foreground">{countProcedureType("كلي")}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">مناظير</span>
                <span className="text-lg font-semibold text-foreground">
                  {(countProcedureType("مناظير") || 0) + (endoscopiesData?.length || 0)}
                </span>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              ملاحظة: (مناظير) هنا = مناظير الخدمات + سجلات جدول المناظير.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Performance Indicators */}
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          مؤشرات الأداء الرئيسية
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="معدل الدخول"
            value={totalAdmissions}
            previousValue={previousAdmissions?.length}
            colorScheme="cyan"
          />
          <KPICard
            title="معدل الخروج"
            value={totalDischarges}
            previousValue={previousDischarges?.length}
            colorScheme="pink"
          />
          <KPICard
            title="معدل الاشغال"
            value={activeAdmissions?.length || 0}
            format="number"
            colorScheme="green"
          />
          <KPICard
            title="حالات الوفاة"
            value={deathCases}
              previousValue={previousDischarges?.filter((d: any) => d.discharge_status === "وفاة").length}
            colorScheme="orange"
          />
        </div>
      </div>

      {/* Department Stats - Detailed */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {departmentStats.map((dept, idx) => (
          <Card key={idx} className="shadow-lg border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Building2 className="h-5 w-5 text-primary" />
                {dept.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-cyan/10 border border-cyan/20">
                  <span className="text-sm text-muted-foreground">الدخول:</span>
                  <span className="text-2xl font-bold text-cyan">{dept.admissions}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-pink/10 border border-pink/20">
                  <span className="text-sm text-muted-foreground">الخروج:</span>
                  <span className="text-2xl font-bold text-pink">{dept.discharges}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green/10 border border-green/20">
                  <span className="text-sm text-muted-foreground">المحجوزين حالياً:</span>
                  <span className="text-2xl font-bold text-green">{dept.active}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <span className="text-sm text-muted-foreground font-semibold">الإجمالي:</span>
                  <span className="text-2xl font-bold text-primary">{dept.totalCases}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Department Distribution Chart */}
        <Card className="shadow-lg border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="h-5 w-5 text-primary" />
              توزيع الحالات حسب القسم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend />
                <Bar dataKey="admissions" fill={COLORS.cyan} radius={[8, 8, 0, 0]} name="الدخول" />
                <Bar dataKey="discharges" fill={COLORS.pink} radius={[8, 8, 0, 0]} name="الخروج" />
                <Bar dataKey="active" fill={COLORS.green} radius={[8, 8, 0, 0]} name="المحجوزين" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Interactive Monthly Chart - Merged Procedures into Emergencies */}
        <Card className="shadow-lg border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="h-5 w-5 text-primary" />
              الإحصائيات الشهرية (تفاعلي)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="admissions-check"
                  checked={visibleSeries.admissions}
                  onCheckedChange={(checked) =>
                    setVisibleSeries({ ...visibleSeries, admissions: !!checked })
                  }
                />
                <label htmlFor="admissions-check" className="text-sm cursor-pointer">
                  <span className="inline-block w-3 h-3 rounded-full mr-1" style={{ backgroundColor: COLORS.cyan }}></span>
                  الدخول
                </label>
              </div>
              
              <div className="flex items-center gap-2">
                <Checkbox
                  id="discharges-check"
                  checked={visibleSeries.discharges}
                  onCheckedChange={(checked) =>
                    setVisibleSeries({ ...visibleSeries, discharges: !!checked })
                  }
                />
                <label htmlFor="discharges-check" className="text-sm cursor-pointer">
                  <span className="inline-block w-3 h-3 rounded-full mr-1" style={{ backgroundColor: COLORS.pink }}></span>
                  الخروج
                </label>
              </div>
              
              <div className="flex items-center gap-2">
                <Checkbox
                  id="emergencies-check"
                  checked={visibleSeries.emergencies}
                  onCheckedChange={(checked) =>
                    setVisibleSeries({ ...visibleSeries, emergencies: !!checked })
                  }
                />
                <label htmlFor="emergencies-check" className="text-sm cursor-pointer">
                  <span className="inline-block w-3 h-3 rounded-full mr-1" style={{ backgroundColor: COLORS.orange }}></span>
                  الطوارئ + البذل
                </label>
              </div>
              
              <div className="flex items-center gap-2">
                <Checkbox
                  id="endoscopies-check"
                  checked={visibleSeries.endoscopies}
                  onCheckedChange={(checked) =>
                    setVisibleSeries({ ...visibleSeries, endoscopies: !!checked })
                  }
                />
                <label htmlFor="endoscopies-check" className="text-sm cursor-pointer">
                  <span className="inline-block w-3 h-3 rounded-full mr-1" style={{ backgroundColor: COLORS.purple }}></span>
                  المناظير
                </label>
              </div>
              
              <div className="flex items-center gap-2">
                <Checkbox
                  id="unreturned-loans-check"
                  checked={visibleSeries.unreturned_loans}
                  onCheckedChange={(checked) =>
                    setVisibleSeries({ ...visibleSeries, unreturned_loans: !!checked })
                  }
                />
                <label htmlFor="unreturned-loans-check" className="text-sm cursor-pointer">
                  <span className="inline-block w-3 h-3 rounded-full mr-1" style={{ backgroundColor: COLORS.purple }}></span>
                  ملفات لم تُرجع
                </label>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="monthName" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend />
                {visibleSeries.admissions && (
                  <Line type="monotone" dataKey="admissions" stroke={COLORS.cyan} strokeWidth={2} name="الدخول" />
                )}
                {visibleSeries.discharges && (
                  <Line type="monotone" dataKey="discharges" stroke={COLORS.pink} strokeWidth={2} name="الخروج" />
                )}
                {visibleSeries.emergencies && (
                  <Line type="monotone" dataKey="emergencies" stroke={COLORS.orange} strokeWidth={2} name="الطوارئ + البذل" />
                )}
                {visibleSeries.endoscopies && (
                  <Line type="monotone" dataKey="endoscopies" stroke={COLORS.purple} strokeWidth={2} name="المناظير" />
                )}
                {visibleSeries.unreturned_loans && (
                  <Line type="monotone" dataKey="unreturned_loans" stroke="#8b5cf6" strokeWidth={2} name="ملفات لم تُرجع" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
    
    {/* Loan Alert Notification */}
    <LoanAlertNotification />
    </Layout>
  );
}