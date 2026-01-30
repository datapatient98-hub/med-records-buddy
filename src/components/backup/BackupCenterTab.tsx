import * as React from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

import BackupArtifactsPanel from "@/components/backup/BackupArtifactsPanel";
import BackupSheetsPreviewDialog from "@/components/backup/BackupSheetsPreviewDialog";

type BackupRun = {
  id: string;
  created_at: string;
  schedule_type: "manual" | "daily" | "weekly" | "monthly";
  status: "queued" | "running" | "success" | "failed";
  unit: string | null;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
};

function statusBadgeVariant(status: BackupRun["status"]) {
  switch (status) {
    case "success":
      return "outline";
    case "failed":
      return "destructive";
    default:
      return "secondary";
  }
}

export default function BackupCenterTab() {
  const [loading, setLoading] = React.useState(false);
  const [runs, setRuns] = React.useState<BackupRun[]>([]);
  const [config, setConfig] = React.useState<{
    service_account_email: string | null;
    drive_folder_id: string | null;
    sheets_spreadsheet_id: string | null;
    sheets_tab_name: string | null;
  } | null>(null);

  const [testOpen, setTestOpen] = React.useState(false);
  const [testLoading, setTestLoading] = React.useState(false);
  const [testResult, setTestResult] = React.useState<any>(null);

  const [sheetPreviewOpen, setSheetPreviewOpen] = React.useState(false);

  const [targets, setTargets] = React.useState<{ drive: boolean; sheets: boolean }>({ drive: true, sheets: true });
  const [savingTargets, setSavingTargets] = React.useState(false);

  const loadTargets = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "backup_settings")
        .maybeSingle();
      if (error) throw error;
      const t = (data?.setting_value as any)?.targets as { drive?: boolean; sheets?: boolean } | undefined;
      setTargets({ drive: t?.drive !== false, sheets: t?.sheets !== false });
    } catch {
      // ignore
    }
  }, []);

  const saveTargets = React.useCallback(
    async (next: { drive: boolean; sheets: boolean }) => {
      setSavingTargets(true);
      try {
        // This requires Admin due to RLS policy on app_settings.
        const { data: existing, error: readErr } = await supabase
          .from("app_settings")
          .select("id, setting_value")
          .eq("setting_key", "backup_settings")
          .maybeSingle();
        if (readErr) throw readErr;

        const prev = (existing?.setting_value as any) ?? {};
        const merged = { ...prev, targets: { ...(prev.targets ?? {}), drive: next.drive, sheets: next.sheets } };

        if (existing?.id) {
          const { error: upErr } = await supabase.from("app_settings").update({ setting_value: merged }).eq("id", existing.id);
          if (upErr) throw upErr;
        } else {
          const { error: insErr } = await supabase.from("app_settings").insert({ setting_key: "backup_settings", setting_value: merged });
          if (insErr) throw insErr;
        }

        setTargets(next);
        toast.success("تم حفظ إعدادات النسخ");
      } catch (err: any) {
        toast.error(err?.message ?? "تعذر حفظ الإعدادات (مسموح للمسؤول فقط)");
      } finally {
        setSavingTargets(false);
      }
    },
    []
  );

  const loadConfig = React.useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("backup-config");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setConfig(data ?? null);
    } catch (err: any) {
      // Keep the rest of the page usable even if this fails.
      setConfig(null);
    }
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("backup_runs" as any)
        .select("id, created_at, schedule_type, status, unit, started_at, finished_at, error_message")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setRuns((data ?? []) as any);
    } catch (err: any) {
      toast.error(err?.message ?? "تعذر تحميل سجل النسخ");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    void loadConfig();
    void loadTargets();
  }, [load, loadConfig, loadTargets]);

  const ensureSignedIn = React.useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      toast.error(error.message);
      return false;
    }
    if (!data.session) {
      toast.error("لازم تسجّل دخول الأول قبل تشغيل النسخ الاحتياطي");
      return false;
    }
    return true;
  }, []);

  const runNow = async () => {
    try {
      if (!(await ensureSignedIn())) return;
      const { data, error } = await supabase.functions.invoke("backup-run", { body: { schedule_type: "manual" } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("تم بدء النسخ (تم تسجيل العملية)");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "تعذر بدء النسخ");
    }
  };

  const openDriveFolder = () => {
    const id = config?.drive_folder_id;
    if (!id) {
      toast.error("لا يوجد Drive Folder ID مضبوط");
      return;
    }
    window.open(`https://drive.google.com/drive/folders/${encodeURIComponent(id)}`, "_blank", "noopener,noreferrer");
  };

  const openSheets = () => {
    const id = config?.sheets_spreadsheet_id;
    if (!id) {
      toast.error("لا يوجد Google Sheet ID مضبوط");
      return;
    }
    window.open(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/edit`, "_blank", "noopener,noreferrer");
  };

  const runConnectionTest = async () => {
    setTestOpen(true);
    setTestLoading(true);
    setTestResult(null);
    try {
      if (!(await ensureSignedIn())) {
        setTestResult({ error: "غير مسجّل دخول" });
        return;
      }
      const { data, error } = await supabase.functions.invoke("backup-connection-test");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTestResult(data);
      toast.success("تم تنفيذ اختبار الربط");
    } catch (err: any) {
      setTestResult({ error: err?.message ?? "تعذر تنفيذ اختبار الربط" });
      toast.error(err?.message ?? "تعذر تنفيذ اختبار الربط");
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>مركز النسخ الاحتياطي</CardTitle>
          <div className="flex items-center gap-2">
            <Button onClick={runNow}>بدء نسخ الآن</Button>
            <Button variant="outline" onClick={runConnectionTest} disabled={testLoading}>
              {testLoading ? "جاري الاختبار..." : "اختبار الربط"}
            </Button>
            <Button variant="outline" onClick={load} disabled={loading}>
              {loading ? "جاري..." : "تحديث"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            هذه الصفحة تسجّل عمليات النسخ (اليومي/الأسبوعي/الشهري/اليدوي) وتعرض آخر النتائج.
          </p>

          <Separator />

          <div className="space-y-2" dir="rtl">
            <div className="text-sm font-medium">وجهات النسخ (اختياري)</div>
            <div className="text-xs text-muted-foreground">
              لو في مشكلة وصول لمواقع Google أو عايز تسريع، ممكن توقف Drive/Sheets مؤقتاً. (التخزين الداخلي يظل يعمل دائماً)
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm">الرفع إلى Drive</div>
                  <div className="text-xs text-muted-foreground">رفع ملف Excel على Drive</div>
                </div>
                <Switch
                  checked={targets.drive}
                  onCheckedChange={(v) => void saveTargets({ ...targets, drive: v })}
                  disabled={savingTargets}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm">التسجيل في Sheets</div>
                  <div className="text-xs text-muted-foreground">تسجيل سطر في Google Sheet</div>
                </div>
                <Switch
                  checked={targets.sheets}
                  onCheckedChange={(v) => void saveTargets({ ...targets, sheets: v })}
                  disabled={savingTargets}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2" dir="rtl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-medium">معلومات ربط Drive / Sheets</div>
                <div className="text-xs text-muted-foreground">
                  لازم مشاركة الفولدر والشيت مع نفس إيميل خدمة Google عشان مايحصلش Permission errors.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={openDriveFolder}>
                  فتح الفولدر
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={openSheets}>
                  فتح الشيت
                </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSheetPreviewOpen(true)}>
                    عرض الشيت هنا
                  </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">Service Account Email</div>
                <div className="font-mono text-xs break-all">{config?.service_account_email ?? "-"}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">Drive Folder ID</div>
                <div className="font-mono text-xs break-all">{config?.drive_folder_id ?? "-"}</div>
              </div>
              <div className="rounded-md border p-2 sm:col-span-2">
                <div className="text-xs text-muted-foreground">Google Sheet</div>
                <div className="font-mono text-xs break-all">
                  {config?.sheets_spreadsheet_id ? `${config.sheets_spreadsheet_id} (tab: ${config?.sheets_tab_name ?? "Backups"})` : "-"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

        <BackupArtifactsPanel />

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>نتيجة اختبار الربط</DialogTitle>
            <DialogDescription>
              الاختبار يتحقق من الوصول للفولدر والشيت، ويكتب سطر Test ثم يمسح قيمه تلقائيًا.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            {testResult?.error ? (
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">خطأ</div>
                <div className="font-mono text-xs break-all">{String(testResult.error)}</div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Service Account Email</div>
                    <div className="font-mono text-xs break-all">{testResult?.service_account_email ?? "-"}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Drive</div>
                    <div className="text-sm">
                      {testResult?.drive?.ok ? "✅ OK" : "❌ فشل"} (status: {testResult?.drive?.status ?? "-"})
                    </div>
                  </div>
                  <div className="rounded-md border p-3 sm:col-span-2">
                    <div className="text-xs text-muted-foreground">Sheets</div>
                    <div className="text-sm">
                      قراءة: {testResult?.sheets?.read_ok ? "✅" : "❌"} — كتابة: {testResult?.sheets?.write_ok ? "✅" : "❌"} — مسح: {testResult?.sheets?.cleared_ok ? "✅" : "❌"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      tab: {testResult?.sheets?.tab_name ?? "Backups"} | range: {testResult?.sheets?.append_range ?? "-"}
                    </div>
                    {(testResult?.sheets?.append_error || testResult?.sheets?.clear_error) && (
                      <div className="mt-2 font-mono text-xs break-all">
                        {testResult?.sheets?.append_error ? `append_error: ${testResult.sheets.append_error}` : ""}
                        {testResult?.sheets?.clear_error ? `\nclear_error: ${testResult.sheets.clear_error}` : ""}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => testResult?.links?.drive_folder && window.open(testResult.links.drive_folder, "_blank", "noopener,noreferrer")}
                    disabled={!testResult?.links?.drive_folder}
                  >
                    فتح فولدر Drive
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => testResult?.links?.sheet && window.open(testResult.links.sheet, "_blank", "noopener,noreferrer")}
                    disabled={!testResult?.links?.sheet}
                  >
                    فتح Google Sheet
                  </Button>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTestOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BackupSheetsPreviewDialog open={sheetPreviewOpen} onOpenChange={setSheetPreviewOpen} />

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-right">النوع</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">الوحدة</TableHead>
              <TableHead className="text-right">ملاحظة/خطأ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap">{new Date(r.created_at).toLocaleString("ar-EG")}</TableCell>
                <TableCell className="whitespace-nowrap">{r.schedule_type}</TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(r.status)}>{r.status}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">{r.unit ?? "-"}</TableCell>
                <TableCell className="max-w-[420px] truncate">{r.error_message ?? "-"}</TableCell>
              </TableRow>
            ))}
            {runs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  لا توجد عمليات نسخ مسجلة بعد.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
