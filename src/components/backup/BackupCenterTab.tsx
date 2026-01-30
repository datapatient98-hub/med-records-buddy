import * as React from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

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
  }, [load, loadConfig]);

  const runNow = async () => {
    try {
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

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>مركز النسخ الاحتياطي</CardTitle>
          <div className="flex items-center gap-2">
            <Button onClick={runNow}>بدء نسخ الآن</Button>
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
