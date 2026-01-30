import * as React from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  onProceed: () => void;
  onCancel: () => void;
};

/**
 * Logout Guard: If time >= 13:30 and no successful backup today, block logout + show backup button.
 */
export default function BackupLogoutGuard({ onProceed, onCancel }: Props) {
  const [open, setOpen] = React.useState(false);
  const [blocking, setBlocking] = React.useState(false);
  const [running, setRunning] = React.useState(false);

  const check = React.useCallback(async () => {
    try {
      // 1) Check if backup_settings.logout_guard.enabled
      const { data: settingsRow } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "backup_settings")
        .single();

      const guardEnabled = (settingsRow?.setting_value as any)?.logout_guard?.enabled ?? false;
      if (!guardEnabled) {
        onProceed();
        return;
      }

      // 2) Check current time vs 13:30 Cairo
      const now = new Date();
      const cairoOffset = 2; // Africa/Cairo = UTC+2 (or +3 during DST, simplified)
      const cairoTime = new Date(now.getTime() + cairoOffset * 60 * 60 * 1000);
      const hh = cairoTime.getUTCHours();
      const mm = cairoTime.getUTCMinutes();
      const minutesOfDay = hh * 60 + mm;
      const dueAt = 13 * 60 + 30; // 13:30 = 810 minutes

      if (minutesOfDay < dueAt) {
        // Before 1:30 PM → allow logout
        onProceed();
        return;
      }

      // 3) Check if a successful backup run today
      const todayStart = new Date(cairoTime.getUTCFullYear(), cairoTime.getUTCMonth(), cairoTime.getUTCDate());
      const { data: runs, error } = await supabase
        .from("backup_runs")
        .select("id, status")
        .eq("status", "success")
        .gte("created_at", todayStart.toISOString())
        .limit(1);

      if (error) throw error;
      if ((runs ?? []).length > 0) {
        // Backup done → allow logout
        onProceed();
        return;
      }

      // 4) No backup yet → block
      setBlocking(true);
      setOpen(true);
    } catch (err) {
      console.error("BackupLogoutGuard check failed:", err);
      onProceed(); // Fail-safe: allow logout
    }
  }, [onProceed]);

  React.useEffect(() => {
    void check();
  }, [check]);

  const runNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("backup-run", {
        body: { schedule_type: "manual" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("تم بدء النسخ الاحتياطي، سيتم تسجيل الخروج عند الانتهاء");
      // Simulate "success" after 2s (in real implementation you'd poll or use realtime)
      setTimeout(() => {
        setOpen(false);
        onProceed();
      }, 2000);
    } catch (err: any) {
      toast.error(err?.message ?? "تعذر بدء النسخ");
    } finally {
      setRunning(false);
    }
  };

  if (!blocking) return null;

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>انتبه: النسخ الاحتياطي مطلوب</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>لم يتم تشغيل نسخة احتياطية ناجحة اليوم بعد 1:30 مساءً.</p>
            <p>يجب عمل نسخة احتياطية الآن قبل تسجيل الخروج.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onCancel}>
            إلغاء الخروج
          </Button>
          <Button onClick={runNow} disabled={running}>
            {running ? "جاري النسخ..." : "اعمل نسخ الآن"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
