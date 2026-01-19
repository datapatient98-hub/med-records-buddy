import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardCard from "@/components/DashboardCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  TrendingUp,
  FileDown,
  Activity,
  Users,
  UserCheck,
  UserX,
  CalendarDays,
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
import { ar } from "date-fns/locale";

const COLORS = {
  primary: "hsl(200, 95%, 55%)",
  cyan: "hsl(188, 85%, 55%)",
  pink: "hsl(330, 85%, 60%)",
  green: "hsl(142, 76%, 45%)",
  purple: "hsl(265, 85%, 62%)",
  orange: "hsl(35, 91%, 60%)",
};

type PeriodType = "today" | "week" | "month" | "quarter" | "year";

export default function Dashboard() {
  const [period, setPeriod] = useState<PeriodType>("month");

  // Calculate date range based on period
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

  // Fetch admissions for period
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

  // Fetch discharges for period
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

  // Fetch emergencies for period
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

  // Fetch endoscopies for period
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

  // Calculate stats
  const totalAdmissions = admissionsData?.length || 0;
  const todayAdmissions = admissionsData?.filter(
    (a) => format(new Date(a.created_at || ""), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  ).length || 0;
  const weekAdmissions = admissionsData?.filter(
    (a) => new Date(a.created_at || "") >= startOfWeek(new Date())
  ).length || 0;

  const totalDischarges = dischargesData?.length || 0;
  const todayDischarges = dischargesData?.filter(
    (d) => format(new Date(d.created_at || ""), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  ).length || 0;
  const weekDischarges = dischargesData?.filter(
    (d) => new Date(d.created_at || "") >= startOfWeek(new Date())
  ).length || 0;

  const totalEmergencies = emergenciesData?.length || 0;
  const totalEndoscopies = endoscopiesData?.length || 0;

  // Active admissions (محجوز)
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

  // Gender distribution
  const genderStats = [
    { name: "ذكر", value: admissionsData?.filter((a) => a.gender === "ذكر").length || 0 },
    { name: "أنثى", value: admissionsData?.filter((a) => a.gender === "أنثى").length || 0 },
  ];

  // Death cases
  const deathCases = dischargesData?.filter((d) => d.discharge_status === "وفاة").length || 0;

  // Department stats
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*");
      return data || [];
    },
  });

  const departmentStats = departments?.map((dept) => ({
    name: dept.name,
    admissions: admissionsData?.filter((a) => a.department_id === dept.id).length || 0,
    discharges: dischargesData?.filter(
      (d) => d.admissions?.department_id === dept.id
    ).length || 0,
    active: activeAdmissions?.filter((a) => a.department_id === dept.id).length || 0,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground">لوحة التحكم</h2>
          <p className="text-muted-foreground">نظرة شاملة على البيانات - {dateRange.label}</p>
        </div>

        <div className="flex gap-2">
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
          <Button variant="outline" size="sm">
            <FileDown className="ml-2 h-4 w-4" />
            تصدير Excel
          </Button>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="الزيارات هذا الشهر"
          value={totalAdmissions}
          icon={Calendar}
          color="cyan"
          stats={[
            { label: "اليوم", value: todayAdmissions },
            { label: "الأسبوع", value: weekAdmissions },
          ]}
        />

        <DashboardCard
          title="المرضى هذا الشهر"
          value={totalDischarges}
          icon={Activity}
          color="pink"
          stats={[
            { label: "اليوم", value: todayDischarges },
            { label: "الأسبوع", value: weekDischarges },
          ]}
        />

        <DashboardCard
          title="إجمالي الزيارات"
          value={totalEmergencies}
          icon={Users}
          color="green"
          stats={[
            { label: "اليوم", value: todayAdmissions },
            { label: "الأسبوع", value: weekAdmissions },
          ]}
        />

        <DashboardCard
          title="إجمالي المرضى"
          value={totalEndoscopies}
          icon={UserCheck}
          color="purple"
          stats={[
            { label: "اليوم", value: todayDischarges },
            { label: "الأسبوع", value: weekDischarges },
          ]}
        />
      </div>

      {/* Clinic/Department Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-lg border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <CalendarDays className="h-5 w-5 text-primary" />
              عيادة الحجوزات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "اليوم", value: 173, color: "text-green" },
                { label: "الأسبوع", value: 2399, color: "text-orange" },
                { label: "الشهر", value: 5582, color: "text-orange" },
                { label: "الإجمالي", value: 5595, color: "text-primary" },
              ].map((stat, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="text-sm text-muted-foreground">{stat.label}:</span>
                  <span className={`text-xl font-bold ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <UserX className="h-5 w-5 text-primary" />
              عيادة المحفوظين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "اليوم", value: 47, color: "text-green" },
                { label: "الأسبوع", value: 622, color: "text-orange" },
                { label: "الشهر", value: 1700, color: "text-orange" },
                { label: "الإجمالي", value: 1707, color: "text-primary" },
              ].map((stat, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="text-sm text-muted-foreground">{stat.label}:</span>
                  <span className={`text-xl font-bold ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Department Distribution */}
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

        {/* Gender Distribution */}
        <Card className="shadow-lg border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Users className="h-5 w-5 text-primary" />
              توزيع المرضى (ذكر/أنثى)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={genderStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) =>
                    `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={100}
                  fill={COLORS.primary}
                  dataKey="value"
                >
                  {genderStats.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? COLORS.cyan : COLORS.pink}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-lg border-border bg-gradient-to-br from-destructive/20 to-destructive/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">حالات الوفاة</p>
                <p className="text-3xl font-bold text-destructive">{deathCases}</p>
              </div>
              <UserX className="h-12 w-12 text-destructive opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-border bg-gradient-to-br from-green/20 to-green/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">الحالات النشطة</p>
                <p className="text-3xl font-bold text-green">{activeAdmissions?.length || 0}</p>
              </div>
              <UserCheck className="h-12 w-12 text-green opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-border bg-gradient-to-br from-orange/20 to-orange/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">الطوارئ</p>
                <p className="text-3xl font-bold text-orange">{totalEmergencies}</p>
              </div>
              <Activity className="h-12 w-12 text-orange opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}