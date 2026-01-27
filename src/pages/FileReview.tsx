import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Building2, FileArchive, ShieldCheck, Search } from "lucide-react";
import { AdmissionDischargeSearchBar } from "@/components/fileReview/AdmissionDischargeSearchBar";
import { downloadFileReviewServicesExcel } from "@/lib/excel/exportFileReviewServicesExcel";
import { useToast } from "@/hooks/use-toast";

type DateRange = {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
};

function ymdToStart(s: string) {
  return `${s}T00:00:00`;
}

function ymdToEnd(s: string) {
  return `${s}T23:59:59.999`;
}

function defaultLast30Days(): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);

  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return { from: fmt(from), to: fmt(to) };
}

function normalizeText(v: any) {
  return String(v ?? "").trim();
}

function isLikelyInvalidNationalId(nationalId: any) {
  const s = normalizeText(nationalId);
  if (!s) return true;
  return !/^\d{14}$/.test(s);
}

function isLikelyInvalidPhone(phone: any) {
  const s = normalizeText(phone);
  if (!s) return true;
  return !/^\d{11}$/.test(s);
}

function isLikelyIncompleteName(name: any) {
  const s = normalizeText(name);
  if (!s) return true;
  const parts = s.split(/\s+/).filter(Boolean);
  return parts.length < 4;
}

export default function FileReview() {
  const { toast } = useToast();
  const [range, setRange] = useState<DateRange>(() => defaultLast30Days());
  const [patientSearch, setPatientSearch] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"quality" | "departments" | "loans" | "anomalies" | "audit" | "errors">("quality");

  const [exportingServices, setExportingServices] = useState(false);

  // Scope: keep this page fast by default (last 30 days + capped size).
  // If data grows huge later, we will move heavy anomaly detection into backend functions + indexes.
  const { data: admissions, isLoading: admissionsLoading } = useQuery({
    queryKey: ["file-review", "admissions", range.from, range.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admissions")
        .select(
          `id, unified_number, patient_name, national_id, phone, department:departments(name), updated_at, created_at, admission_date`,
        )
        .gte("created_at", ymdToStart(range.from))
        .lte("created_at", ymdToEnd(range.to))
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: loans, isLoading: loansLoading } = useQuery({
    queryKey: ["file-review", "loans", range.from, range.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("file_loans")
        .select(`id, unified_number, borrowed_by, borrowed_to_department, loan_reason, loan_date, return_date, is_returned`)
        .gte("created_at", ymdToStart(range.from))
        .lte("created_at", ymdToEnd(range.to))
        .order("loan_date", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const auditQuery = useMemo(() => auditSearch.trim(), [auditSearch]);
  const { data: auditRows, isLoading: auditLoading } = useQuery({
    queryKey: ["file-review", "admissions-audit", activeTab, auditQuery],
    // Load automatically when the tab is open; filter only if user provided unified number.
    enabled: activeTab === "audit",
    queryFn: async () => {
      let q = supabase
        .from("admissions_audit")
        .select("id, unified_number, admission_id, changed_at, changed_by, changed_fields")
        .order("changed_at", { ascending: false })
        .limit(100);

      if (auditQuery.length > 0) {
        q = q.eq("unified_number", auditQuery);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const quality = useMemo(() => {
    const list = admissions ?? [];

    const invalidName = list.filter((r) => isLikelyIncompleteName(r.patient_name));
    const invalidNationalId = list.filter((r) => isLikelyInvalidNationalId(r.national_id));
    const invalidPhone = list.filter((r) => isLikelyInvalidPhone(r.phone));

    return {
      total: list.length,
      invalidName,
      invalidNationalId,
      invalidPhone,
    };
  }, [admissions]);

  const departmentKpis = useMemo(() => {
    const list = admissions ?? [];
    const map = new Map<string, { dept: string; total: number; missingCore: number }>();

    for (const r of list) {
      const dept = r?.department?.name ?? "غير محدد";
      const prev = map.get(dept) ?? { dept, total: 0, missingCore: 0 };
      prev.total += 1;
      const missingCore =
        isLikelyIncompleteName(r.patient_name) || isLikelyInvalidNationalId(r.national_id) || isLikelyInvalidPhone(r.phone);
      if (missingCore) prev.missingCore += 1;
      map.set(dept, prev);
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [admissions]);

  const loansOverdue = useMemo(() => {
    const list = loans ?? [];
    const now = Date.now();
    const THRESHOLD_DAYS = 7; // default governance threshold (can be made configurable later)
    const ms = THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

    return list
      .filter((l) => !l.is_returned)
      .filter((l) => {
        const d = l.loan_date ? new Date(l.loan_date).getTime() : NaN;
        if (Number.isNaN(d)) return true;
        return now - d >= ms;
      });
  }, [loans]);

  const anomalies = useMemo(() => {
    const list = admissions ?? [];
    // Same unified_number with multiple different names (within the loaded scope)
    const m = new Map<string, Set<string>>();
    for (const r of list) {
      const un = normalizeText(r.unified_number);
      if (!un) continue;
      const name = normalizeText(r.patient_name);
      const set = m.get(un) ?? new Set<string>();
      if (name) set.add(name);
      m.set(un, set);
    }

    const inconsistentNames = Array.from(m.entries())
      .filter(([, names]) => names.size >= 2)
      .map(([unifiedNumber, names]) => ({ unifiedNumber, names: Array.from(names).slice(0, 5) }))
      .slice(0, 100);

    // Duplicate national_id in admissions (within the loaded scope)
    const nmap = new Map<string, Set<string>>();
    for (const r of list) {
      const nid = normalizeText(r.national_id);
      if (!nid || isLikelyInvalidNationalId(nid)) continue;
      const un = normalizeText(r.unified_number);
      const set = nmap.get(nid) ?? new Set<string>();
      if (un) set.add(un);
      nmap.set(nid, set);
    }
    const duplicateNationalId = Array.from(nmap.entries())
      .filter(([, uns]) => uns.size >= 2)
      .map(([nationalId, uns]) => ({ nationalId, unifiedNumbers: Array.from(uns).slice(0, 10) }))
      .slice(0, 100);

    return { inconsistentNames, duplicateNationalId };
  }, [admissions]);

  const quickSearchHint = useMemo(() => {
    const q = patientSearch.trim();
    if (!q) return "";
    // Just a UX hint — actual unified history is opened from the header search.
    if (/^\d{14}$/.test(q)) return "قومي";
    if (/^\d{11}$/.test(q)) return "هاتف";
    if (/^\d+$/.test(q)) return "رقم";
    return "اسم";
  }, [patientSearch]);

  const kpiCards = useMemo(() => {
    const total = quality.total;
    const missing = new Set<string>();
    for (const r of quality.invalidName) missing.add(r.id);
    for (const r of quality.invalidNationalId) missing.add(r.id);
    for (const r of quality.invalidPhone) missing.add(r.id);

    return {
      total,
      missingCore: missing.size,
      overdueLoans: loansOverdue.length,
      anomalies: anomalies.inconsistentNames.length + anomalies.duplicateNationalId.length,
    };
  }, [anomalies.duplicateNationalId.length, anomalies.inconsistentNames.length, loansOverdue.length, quality.invalidName, quality.invalidNationalId, quality.invalidPhone, quality.total]);

  return (
    <Layout>
      <div className="space-y-6">
        <header className="space-y-2">
          <h2 className="text-3xl font-bold text-foreground">مراجعة وتقييم الملفات والأقسام</h2>
          <p className="text-muted-foreground">
            لوحة حوكمة مختصرة لمراقبة جودة البيانات، أداء الأقسام، الاستعارات، والشذوذ — مصممة لتبقى سريعة مع تضخم البيانات.
          </p>
        </header>

        {/* Controls */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">نطاق المراجعة</CardTitle>
                <CardDescription>افتراضيًا آخر 30 يوم (للحفاظ على السرعة).</CardDescription>
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={exportingServices}
                onClick={async () => {
                  setExportingServices(true);
                  try {
                    const [em, en, pr] = await Promise.all([
                      supabase
                        .from("emergencies")
                        .select("id, unified_number, patient_name, national_id, phone, internal_number, visit_date, created_at")
                        .gte("created_at", ymdToStart(range.from))
                        .lte("created_at", ymdToEnd(range.to))
                        .order("created_at", { ascending: false })
                        .limit(1000),
                      supabase
                        .from("endoscopies")
                        .select("id, unified_number, patient_name, national_id, phone, internal_number, procedure_date, created_at")
                        .gte("created_at", ymdToStart(range.from))
                        .lte("created_at", ymdToEnd(range.to))
                        .order("created_at", { ascending: false })
                        .limit(1000),
                      supabase
                        .from("procedures")
                        .select("id, unified_number, patient_name, national_id, phone, internal_number, procedure_type, procedure_date, created_at")
                        .gte("created_at", ymdToStart(range.from))
                        .lte("created_at", ymdToEnd(range.to))
                        .order("created_at", { ascending: false })
                        .limit(1000),
                    ]);

                    if (em.error) throw em.error;
                    if (en.error) throw en.error;
                    if (pr.error) throw pr.error;

                    downloadFileReviewServicesExcel({
                      range,
                      exportedAt: new Date(),
                      fileName: `services_${range.from}_to_${range.to}.xlsx`,
                      emergencies: em.data ?? [],
                      endoscopies: en.data ?? [],
                      procedures: pr.data ?? [],
                    });
                  } catch (e: any) {
                    toast({ title: "خطأ", description: e?.message || "فشل تصدير ملف الخدمات", variant: "destructive" });
                  } finally {
                    setExportingServices(false);
                  }
                }}
              >
                {exportingServices ? "جاري التصدير..." : "تصدير ملف الخدمات"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">من</label>
              <Input type="date" value={range.from} onChange={(e) => setRange((p) => ({ ...p, from: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">إلى</label>
              <Input type="date" value={range.to} onChange={(e) => setRange((p) => ({ ...p, to: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <AdmissionDischargeSearchBar />
            </div>
            {/* NOTE: removed old quick-search input to avoid confusion with the header search.
               The primary search for opening unified history remains in the header bar. */}
          </CardContent>
        </Card>

        {/* KPI Strip */}
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard
            title="حالات ضمن النطاق"
            value={admissionsLoading ? "..." : kpiCards.total}
            icon={<ShieldCheck className="h-5 w-5 text-primary" />}
            hint="عدد سجلات الدخول (آخر 1000 كحد أقصى)."
            onOpen={() => setActiveTab("quality")}
          />
          <KpiCard
            title="نقص بيانات أساسية"
            value={admissionsLoading ? "..." : kpiCards.missingCore}
            icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
            hint="اسم رباعي / قومي 14 / هاتف 11 (ضمن النطاق المحمّل)."
            onOpen={() => setActiveTab("quality")}
          />
          <KpiCard
            title="استعارات متأخرة"
            value={loansLoading ? "..." : kpiCards.overdueLoans}
            icon={<FileArchive className="h-5 w-5 text-primary" />}
            hint="غير مرتجع + أقدم من 7 أيام."
            onOpen={() => setActiveTab("loans")}
          />
          <KpiCard
            title="شذوذ/تكرار"
            value={admissionsLoading ? "..." : kpiCards.anomalies}
            icon={<Building2 className="h-5 w-5 text-primary" />}
            hint="اختلاف اسم لنفس الرقم الموحد + قومي مكرر (ضمن النطاق المحمّل)."
            onOpen={() => setActiveTab("anomalies")}
          />
        </div>

        {/* Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">تفاصيل المراجعة</CardTitle>
            <CardDescription>اختر قسم المراجعة لعرض التفاصيل القابلة للفرز.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="quality">جودة البيانات</TabsTrigger>
                <TabsTrigger value="departments">الأقسام</TabsTrigger>
                <TabsTrigger value="loans">الاستعارات</TabsTrigger>
                <TabsTrigger value="anomalies">الشذوذ</TabsTrigger>
                <TabsTrigger value="audit">سجل التعديلات</TabsTrigger>
                <TabsTrigger value="errors">أخطاء الملفات</TabsTrigger>
              </TabsList>

              <TabsContent value="quality" className="mt-4 space-y-4">
                <SectionTitle title="قوائم نقص البيانات" desc="قوائم قابلة للمراجعة السريعة (ضمن النطاق المحمّل فقط)." />

                <div className="grid gap-4 lg:grid-cols-3">
                  <QualityList title="اسم غير رباعي" rows={quality.invalidName} badge="اسم" />
                  <QualityList title="رقم قومي غير صحيح" rows={quality.invalidNationalId} badge="قومي" />
                  <QualityList title="هاتف غير صحيح" rows={quality.invalidPhone} badge="هاتف" />
                </div>
              </TabsContent>

              <TabsContent value="departments" className="mt-4 space-y-4">
                <SectionTitle title="ملخص الأقسام" desc="إجمالي السجلات + نسبة نقص البيانات الأساسية." />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">القسم</TableHead>
                      <TableHead className="text-center">إجمالي</TableHead>
                      <TableHead className="text-center">نقص بيانات</TableHead>
                      <TableHead className="text-center">النسبة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departmentKpis.map((d) => {
                      const pct = d.total ? Math.round((d.missingCore / d.total) * 100) : 0;
                      return (
                        <TableRow key={d.dept}>
                          <TableCell className="font-medium">{d.dept}</TableCell>
                          <TableCell className="text-center tabular-nums">{d.total}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={d.missingCore > 0 ? "destructive" : "secondary"}>{d.missingCore}</Badge>
                          </TableCell>
                          <TableCell className="text-center tabular-nums">{pct}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="errors" className="mt-4 space-y-4">
                <SectionTitle
                  title="أخطاء الملفات"
                  desc="قائمة أخطاء جودة البيانات (ضمن النطاق المحمّل فقط)."
                />
                <div className="grid gap-4 lg:grid-cols-3">
                  <QualityList title="اسم غير رباعي" rows={quality.invalidName} badge="اسم" />
                  <QualityList title="رقم قومي غير صحيح" rows={quality.invalidNationalId} badge="قومي" />
                  <QualityList title="هاتف غير صحيح" rows={quality.invalidPhone} badge="هاتف" />
                </div>
              </TabsContent>

              <TabsContent value="loans" className="mt-4 space-y-4">
                <SectionTitle title="الاستعارات المتأخرة" desc="غير مرتجع + أقدم من 7 أيام (افتراضي)." />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الرقم الموحد</TableHead>
                      <TableHead>المستعير</TableHead>
                      <TableHead>القسم</TableHead>
                      <TableHead>السبب</TableHead>
                      <TableHead>تاريخ الإعارة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loansOverdue.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono">{l.unified_number}</TableCell>
                        <TableCell>{l.borrowed_by}</TableCell>
                        <TableCell>{l.borrowed_to_department}</TableCell>
                        <TableCell>{l.loan_reason}</TableCell>
                        <TableCell>{l.loan_date ? new Date(l.loan_date).toLocaleString("ar-EG") : "-"}</TableCell>
                      </TableRow>
                    ))}
                    {loansOverdue.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                          لا توجد استعارات متأخرة ضمن النطاق.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="anomalies" className="mt-4 space-y-6">
                <SectionTitle
                  title="الشذوذ والتكرار"
                  desc="مؤشرات أولية ضمن النطاق المحمّل فقط (سننقلها لاحقًا لوظائف خلفية لضمان الدقة على كامل البيانات)."
                />

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">نفس الرقم الموحد بأسماء مختلفة</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الرقم الموحد</TableHead>
                        <TableHead>أمثلة أسماء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {anomalies.inconsistentNames.map((r) => (
                        <TableRow key={r.unifiedNumber}>
                          <TableCell className="font-mono">{r.unifiedNumber}</TableCell>
                          <TableCell className="text-sm">{r.names.join(" — ")}</TableCell>
                        </TableRow>
                      ))}
                      {anomalies.inconsistentNames.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                            لا يوجد ضمن النطاق.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">رقم قومي مكرر</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الرقم القومي</TableHead>
                        <TableHead>أمثلة أرقام موحدة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {anomalies.duplicateNationalId.map((r) => (
                        <TableRow key={r.nationalId}>
                          <TableCell className="font-mono">{r.nationalId}</TableCell>
                          <TableCell className="text-sm font-mono">{r.unifiedNumbers.join(" — ")}</TableCell>
                        </TableRow>
                      ))}
                      {anomalies.duplicateNationalId.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                            لا يوجد ضمن النطاق.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

            <TabsContent value="audit" className="mt-4 space-y-4">
              <SectionTitle
                title="سجل تعديل بيانات الدخول"
                 desc="يظهر تلقائيًا (آخر التعديلات). ويمكنك فلترة النتائج بكتابة الرقم الموحد لمعرفة: الرقم القومي القديم والجديد + بقية التغييرات + اسم الموظف/الجهاز." 
              />

              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={auditSearch}
                          onChange={(e) => setAuditSearch(e.target.value)}
                          placeholder="اكتب الرقم الموحد..."
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Button type="button" variant="secondary" onClick={() => setAuditSearch("")}>
                      مسح
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>المُعدِّل</TableHead>
                        <TableHead>الرقم الموحد</TableHead>
                        <TableHead>الرقم القومي (قديم → جديد)</TableHead>
                        <TableHead>ملخص التغيير</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(auditRows ?? []).map((r) => {
                        const fields = (r.changed_fields ?? {}) as Record<string, { old: any; new: any }>;
                        const nid = fields.national_id;
                        const changedKeys = Object.keys(fields).filter((k) => k !== "updated_at");
                        const summary = changedKeys.slice(0, 6).join("، ");
                        return (
                          <TableRow key={r.id}>
                            <TableCell>{r.changed_at ? new Date(r.changed_at).toLocaleString("ar-EG") : "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{r.changed_by || "غير محدد"}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{r.unified_number || "-"}</TableCell>
                            <TableCell className="font-mono text-sm">
                              {nid ? `${String(nid.old ?? "-")} → ${String(nid.new ?? "-")}` : "(لم يتغير)"}
                            </TableCell>
                            <TableCell className="text-sm">{summary || "-"}</TableCell>
                          </TableRow>
                        );
                      })}
                      {auditLoading && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                            جاري التحميل...
                          </TableCell>
                        </TableRow>
                      )}
                      {!auditLoading && (auditRows ?? []).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                            {auditQuery
                              ? "لا يوجد سجل تعديلات لهذا الرقم الموحد (أو لم يحدث تعديل بعد)."
                              : "لا يوجد تعديلات حديثة ضمن السجل."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function SectionTitle({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}

function KpiCard({
  title,
  value,
  hint,
  icon,
  onOpen,
}: {
  title: string;
  value: any;
  hint: string;
  icon: React.ReactNode;
  onOpen: () => void;
}) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {icon}
        </div>
        <CardDescription className="text-xs">{hint}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-end justify-between">
        <div className="text-3xl font-bold text-foreground leading-none">{value}</div>
        <Button type="button" variant="secondary" size="sm" onClick={onOpen}>
          عرض
        </Button>
      </CardContent>
    </Card>
  );
}

function QualityList({ title, rows, badge }: { title: string; rows: any[]; badge: string }) {
  const top = useMemo(() => rows.slice(0, 30), [rows]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">{title}</CardTitle>
          <Badge variant="outline">{rows.length}</Badge>
        </div>
        <CardDescription className="text-xs">عرض أول 30 حالة لتفادي البطء.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {top.map((r) => (
            <div key={r.id} className="rounded-md border border-border p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{r.patient_name}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{r.unified_number}</p>
                </div>
                <Badge variant="secondary">{badge}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">القسم: {r?.department?.name ?? "-"}</p>
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-muted-foreground">لا يوجد</p>}
        </div>
      </CardContent>
    </Card>
  );
}
