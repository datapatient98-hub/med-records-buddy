import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import DashboardCard from "@/components/DashboardCard";
import KPICard from "@/components/KPICard";
import LoanAlertNotification from "@/components/LoanAlertNotification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import DashboardExportDialog from "@/components/DashboardExportDialog";
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
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from "date-fns";

const COLORS = {
  primary: "hsl(var(--chart-1))",
  cyan: "hsl(var(--chart-1))",
  pink: "hsl(var(--chart-5))",
  green: "hsl(var(--chart-2))",
  purple: "hsl(var(--chart-4))",
  orange: "hsl(var(--chart-3))",
};

type PeriodType = "today" | "week" | "month" | "quarter" | "year";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<PeriodType>("month");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  
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
    queryKey: ["admissions-period", period],
    queryFn: async () => {
      const { data } = await supabase
        .from("admissions")
        .select("*")
        .gte("created_at", dateRange.start);
      return data || [];
    },
  });

  const { data: dischargesData } = useQuery({
    queryKey: ["discharges-period", period],
    queryFn: async () => {
      const { data } = await supabase
        .from("discharges")
        .select("*, admissions(*)")
        .gte("created_at", dateRange.start);
      return data || [];
    },
  });

  const { data: emergenciesData } = useQuery({
    queryKey: ["emergencies-period", period],
    queryFn: async () => {
      const { data } = await supabase
        .from("emergencies")
        .select("*")
        .gte("created_at", dateRange.start);
      return data || [];
    },
  });

  const { data: endoscopiesData } = useQuery({
    queryKey: ["endoscopies-period", period],
    queryFn: async () => {
      const { data } = await supabase
        .from("endoscopies")
        .select("*")
        .gte("created_at", dateRange.start);
      return data || [];
    },
  });

  const { data: proceduresData } = useQuery({
    queryKey: ["procedures-period", period],
    queryFn: async () => {
      const { data } = await supabase
        .from("procedures")
        .select("*")
        .gte("created_at", dateRange.start);
      return data || [];
    },
  });

  const { data: activeAdmissions } = useQuery({
    queryKey: ["active-admissions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admissions")
        .select("*")
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
    queryKey: ["loans-period", period],
    queryFn: async () => {
      const { data } = await supabase
        .from("file_loans")
        .select("*")
        .gte("created_at", dateRange.start);
      return data || [];
    },
  });

  const { data: unreturnedLoans } = useQuery({
    queryKey: ["unreturned-loans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("file_loans")
        .select("*")
        .eq("is_returned", false);
      return data || [];
    },
  });

  // Calculate stats
  const totalAdmissions = admissionsData?.length || 0;
  const todayAdmissions = admissionsData?.filter(
    (a) => format(new Date(a.created_at || ""), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  ).length || 0;
  const weekAdmissions = admissionsData?.filter(
    (a) => new Date(a.created_at || "") >= startOfWeek(new Date())
  ).length || 0;

  const totalDischarges = dischargesData?.length || 0;
  const deathCases = dischargesData?.filter((d) => d.discharge_status === "وفاة").length || 0;
  
  const totalEmergencies = emergenciesData?.length || 0;
  const todayEmergencies = emergenciesData?.filter(
    (e) => format(new Date(e.created_at || ""), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  ).length || 0;
  const weekEmergencies = emergenciesData?.filter(
    (e) => new Date(e.created_at || "") >= startOfWeek(new Date())
  ).length || 0;

  const totalEndoscopies = endoscopiesData?.length || 0;
  const todayEndoscopies = endoscopiesData?.filter(
    (e) => format(new Date(e.created_at || ""), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  ).length || 0;
  const weekEndoscopies = endoscopiesData?.filter(
    (e) => new Date(e.created_at || "") >= startOfWeek(new Date())
  ).length || 0;

  const totalProcedures = proceduresData?.length || 0;
  const todayProcedures = proceduresData?.filter(
    (p) => format(new Date(p.created_at || ""), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  ).length || 0;
  const weekProcedures = proceduresData?.filter(
    (p) => new Date(p.created_at || "") >= startOfWeek(new Date())
  ).length || 0;

  // Department stats
  const departmentStats = departments?.map((dept) => {
    const deptAdmissions = admissionsData?.filter((a) => a.department_id === dept.id).length || 0;
    const deptDischarges = dischargesData?.filter(
      (d) => d.admissions?.department_id === dept.id
    ).length || 0;
    const deptActive = activeAdmissions?.filter((a) => a.department_id === dept.id).length || 0;

    return {
      name: dept.name,
      admissions: deptAdmissions,
      discharges: deptDischarges,
      active: deptActive,
      totalCases: deptAdmissions + deptDischarges,
    };
  }) || [];

  // Loan stats
  const totalLoans = loansData?.length || 0;
  const unreturnedCount = unreturnedLoans?.length || 0;

  // Combined emergencies + procedures (البذل مدمج مع الطوارئ)
  const combinedEmergencies = (emergenciesData?.length || 0) + (proceduresData?.length || 0);
  const todayCombinedEmergencies = todayEmergencies + todayProcedures;
  const weekCombinedEmergencies = weekEmergencies + weekProcedures;

  // KPI calculations for previous period (for comparison)
  const { data: previousAdmissions } = useQuery({
    queryKey: ["previous-admissions", period],
    queryFn: async () => {
      const periodDays = period === "today" ? 1 : period === "week" ? 7 : period === "month" ? 30 : period === "quarter" ? 90 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays * 2);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - periodDays);
      
      const { data } = await supabase
        .from("admissions")
        .select("*")
        .gte("created_at", format(startDate, "yyyy-MM-dd"))
        .lte("created_at", format(endDate, "yyyy-MM-dd"));
      return data || [];
    },
  });

  const { data: previousDischarges } = useQuery({
    queryKey: ["previous-discharges", period],
    queryFn: async () => {
      const periodDays = period === "today" ? 1 : period === "week" ? 7 : period === "month" ? 30 : period === "quarter" ? 90 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays * 2);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - periodDays);
      
      const { data } = await supabase
        .from("discharges")
        .select("*")
        .gte("created_at", format(startDate, "yyyy-MM-dd"))
        .lte("created_at", format(endDate, "yyyy-MM-dd"));
      return data || [];
    },
  });

  // Monthly data for interactive chart - merged procedures into emergencies
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const admissionsCount = admissionsData?.filter(a => new Date(a.created_at || '').getMonth() === i).length || 0;
    const dischargesCount = dischargesData?.filter(d => new Date(d.created_at || '').getMonth() === i).length || 0;
    const emergenciesCount = emergenciesData?.filter(e => new Date(e.created_at || '').getMonth() === i).length || 0;
    const proceduresCount = proceduresData?.filter(p => new Date(p.created_at || '').getMonth() === i).length || 0;
    const endoscopiesCount = endoscopiesData?.filter(e => new Date(e.created_at || '').getMonth() === i).length || 0;
    const loansCount = loansData?.filter(l => new Date(l.created_at || '').getMonth() === i).length || 0;
    const unreturnedLoansCount = loansData?.filter(l => 
      new Date(l.created_at || '').getMonth() === i && !l.is_returned
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
            <p className="text-muted-foreground">نظرة شاملة على البيانات - {dateRange.label}</p>
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
              <DropdownMenuContent align="end" className="min-w-[220px]">
                <DropdownMenuItem onSelect={() => setExportOpen(true)}>
                  <FileDown className="ml-2 h-4 w-4" />
                  تصدير Excel (يوم محدد)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {[
              { key: "today", label: "اليوم" },
              { key: "week", label: "الأسبوع" },
              { key: "month", label: "الشهر" },
              { key: "quarter", label: "3 أشهر" },
              { key: "year", label: "السنة" },
            ].map((p) => (
            <Button
              key={p.key}
              variant={period === p.key ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p.key as PeriodType)}
            >
              {p.label}
            </Button>
          ))}
        </div>
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
            { label: "اليوم", value: dischargesData?.filter(
              (d) => format(new Date(d.created_at || ""), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
            ).length || 0 },
            { label: "الأسبوع", value: dischargesData?.filter(
              (d) => new Date(d.created_at || "") >= startOfWeek(new Date())
            ).length || 0 },
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
            previousValue={previousDischarges?.filter(d => d.discharge_status === "وفاة").length}
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