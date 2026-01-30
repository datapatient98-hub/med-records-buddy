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

  const getCairoNow = React.useCallback(() => {
    // Robust timezone handling (avoids fixed UTC+2/+3 assumptions)
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
  }, []);

  const getCairoDayStartIso = React.useCallback(() => {
    const cairoNow = getCairoNow();
    const y = cairoNow.getFullYear();
    const m = cairoNow.getMonth();
    const d = cairoNow.getDate();

    // Create a Date that represents Cairo midnight in *local* time, then convert to UTC by applying the Cairo offset.
    const cairoMidnightLocal = new Date(y, m, d, 0, 0, 0);
    const offsetMinutes = (Date.now() - getCairoNow().getTime()) / 60000; // (UTC - Cairo)
    const utcMs = cairoMidnightLocal.getTime() + offsetMinutes * 60_000;
    return new Date(utcMs).toISOString();
  }, [getCairoNow]);

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
      const cairoTime = getCairoNow();
      const hh = cairoTime.getHours();
      const mm = cairoTime.getMinutes();
      const minutesOfDay = hh * 60 + mm;
      const dueAt = 13 * 60 + 30; // 13:30 = 810 minutes

      if (minutesOfDay < dueAt) {
        // Before 1:30 PM → allow logout
        onProceed();
        return;
      }

      // 3) Check if a successful backup run today (Cairo day)
      const todayStartIso = getCairoDayStartIso();
      const { data: runs, error } = await supabase
        .from("backup_runs")
        .select("id, status")
        .eq("status", "success")
        .gte("created_at", todayStartIso)
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
  }, [getCairoDayStartIso, getCairoNow, onProceed]);

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

      const runId = data?.run_id as string | undefined;
      if (!runId) throw new Error("لم يتم استلام رقم العملية");

      toast.success("تم بدء النسخ الاحتياطي، سيتم تسجيل الخروج عند الانتهاء");

      // Poll until success/failed (max ~2 minutes)
      const started = Date.now();
      while (Date.now() - started < 120_000) {
        const { data: runRow, error: runErr } = await supabase
          .from("backup_runs")
          .select("status, error_message")
          .eq("id", runId)
          .single();
        if (runErr) throw runErr;

        const status = (runRow as any)?.status as string | undefined;
        if (status === "success") {
          // Pull counts from the latest artifact meta (if available) to show the user a useful summary.
          const { data: art } = await supabase
            .from("backup_artifacts")
            .select("meta")
            .eq("run_id", runId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const totals = (art?.meta as any)?.totals as Record<string, number> | undefined;
          const msg = totals
            ? `تم النسخ الاحتياطي: دخول ${totals.admissions ?? 0} | خروج ${totals.discharges ?? 0} | طوارئ ${totals.emergencies ?? 0} | مناظير ${totals.endoscopies ?? 0} | إجراءات ${totals.procedures ?? 0}`
            : "تم النسخ الاحتياطي بنجاح";
          toast.success(msg);
          setOpen(false);
          onProceed();
          return;
        }
        if (status === "failed") {
          throw new Error((runRow as any)?.error_message ?? "فشل النسخ الاحتياطي");
        }

        await new Promise((r) => setTimeout(r, 2000));
      }

      throw new Error("استغرق النسخ وقتاً أطول من المتوقع، حاول مرة أخرى");
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
