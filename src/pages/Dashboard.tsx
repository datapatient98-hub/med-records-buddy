import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StatsCard from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  UserCheck,
  UserX,
  Activity,
  TrendingUp,
  Calendar,
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

const COLORS = {
  primary: "hsl(var(--chart-1))",
  success: "hsl(var(--chart-2))",
  warning: "hsl(var(--chart-3))",
  info: "hsl(var(--chart-4))",
  danger: "hsl(var(--chart-5))",
};

export default function Dashboard() {
  // Fetch total admissions
  const { data: admissions } = useQuery({
    queryKey: ["admissions-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("admissions")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  // Fetch active admissions (محجوز)
  const { data: activeAdmissions } = useQuery({
    queryKey: ["active-admissions"],
    queryFn: async () => {
      const { count } = await supabase
        .from("admissions")
        .select("*", { count: "exact", head: true })
        .eq("admission_status", "محجوز");
      return count || 0;
    },
  });

  // Fetch discharged patients
  const { data: dischargedCount } = useQuery({
    queryKey: ["discharged-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("discharges")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  // Fetch emergency visits
  const { data: emergencyCount } = useQuery({
    queryKey: ["emergency-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("emergencies")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  // Fetch department statistics
  const { data: departmentStats } = useQuery({
    queryKey: ["department-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admissions")
        .select("department_id, departments(name)")
        .eq("admission_status", "محجوز");

      const stats: Record<string, number> = {};
      data?.forEach((item: any) => {
        const deptName = item.departments?.name || "غير محدد";
        stats[deptName] = (stats[deptName] || 0) + 1;
      });

      return Object.entries(stats).map(([name, value]) => ({ name, value }));
    },
  });

  // Fetch gender distribution
  const { data: genderStats } = useQuery({
    queryKey: ["gender-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admissions")
        .select("gender");

      const stats: Record<string, number> = { ذكر: 0, أنثى: 0 };
      data?.forEach((item) => {
        stats[item.gender] = (stats[item.gender] || 0) + 1;
      });

      return Object.entries(stats).map(([name, value]) => ({ name, value }));
    },
  });

  // Fetch monthly admissions trend
  const { data: monthlyTrend } = useQuery({
    queryKey: ["monthly-trend"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admissions")
        .select("admission_date")
        .gte("admission_date", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());

      const monthStats: Record<string, number> = {};
      data?.forEach((item) => {
        const month = new Date(item.admission_date).toLocaleDateString("ar-EG", {
          month: "short",
          year: "numeric",
        });
        monthStats[month] = (monthStats[month] || 0) + 1;
      });

      return Object.entries(monthStats).map(([month, count]) => ({ month, count }));
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">لوحة التحكم</h2>
        <p className="text-muted-foreground">نظرة عامة على النظام الطبي</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="إجمالي الحالات المسجلة"
          value={admissions || 0}
          icon={<Users className="h-5 w-5" />}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="الحالات النشطة (محجوز)"
          value={activeAdmissions || 0}
          icon={<UserCheck className="h-5 w-5" />}
        />
        <StatsCard
          title="حالات الخروج"
          value={dischargedCount || 0}
          icon={<UserX className="h-5 w-5" />}
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="حالات الطوارئ"
          value={emergencyCount || 0}
          icon={<Activity className="h-5 w-5" />}
          trend={{ value: 5, isPositive: false }}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Department Distribution */}
        <Card className="shadow-medical">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              توزيع المرضى حسب القسم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentStats || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Bar dataKey="value" fill={COLORS.primary} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gender Distribution */}
        <Card className="shadow-medical">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              توزيع المرضى حسب النوع
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={genderStats || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={100}
                  fill={COLORS.primary}
                  dataKey="value"
                >
                  {(genderStats || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? COLORS.primary : COLORS.success}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="shadow-medical md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              اتجاه التسجيلات الشهرية (آخر 6 أشهر)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  dot={{ fill: COLORS.primary, r: 4 }}
                  name="عدد الحالات"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}