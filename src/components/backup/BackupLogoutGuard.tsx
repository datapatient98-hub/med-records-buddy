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
import { Progress } from "@/components/ui/progress";
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

  const [runStartedAt, setRunStartedAt] = React.useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const [estimatedMs, setEstimatedMs] = React.useState<number | null>(null);

  const formatDuration = React.useCallback((ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const mm = Math.floor(totalSec / 60);
    const ss = totalSec % 60;
    return `${mm}:${String(ss).padStart(2, "0")}`;
  }, []);

  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

  const estimateBackupDurationMs = React.useCallback(async () => {
    // Best-effort estimate:
    // 1) Get last successful run duration + totals
    // 2) Estimate current total rows (counts only) for main tables
    // 3) ETA = overhead + (msPerRow * totalRows)
    try {
      const { data: lastRun } = await supabase
        .from("backup_runs")
        .select("id, duration_ms")
        .eq("status", "success")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let msPerRow: number | null = null;
      let baseOverheadMs = 8_000; // token + drive/sheets + workbook overhead

      if (lastRun?.id && typeof (lastRun as any).duration_ms === "number") {
        const { data: lastArt } = await supabase
          .from("backup_artifacts")
          .select("meta")
          .eq("run_id", lastRun.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const totals = (lastArt?.meta as any)?.totals as Record<string, number> | undefined;
        const lastTotalRows = totals
          ? Object.values(totals).reduce((sum, v) => sum + (typeof v === "number" ? v : 0), 0)
          : 0;
        if (lastTotalRows > 0) {
          msPerRow = Math.max(0.15, (lastRun as any).duration_ms / lastTotalRows);
        }
      }

      // Current size estimate (counts only, no data fetch)
      const tablesToCount = [
        "admissions",
        "discharges",
        "emergencies",
        "endoscopies",
        "procedures",
        "file_loans",
        "notes",
        "admissions_audit",
        "deletion_audit",
      ] as const;

      const countResults = await Promise.all(
        tablesToCount.map(async (t) => {
          const { count } = await supabase.from(t).select("id", { count: "exact", head: true });
          return typeof count === "number" ? count : 0;
        })
      );
      const totalRows = countResults.reduce((a, b) => a + b, 0);

      // If we can't infer msPerRow (no prior run), fall back to a safe default.
      if (!msPerRow) {
        // Rough baseline tuned for typical data sizes.
        msPerRow = 0.8;
        baseOverheadMs = 12_000;
      }

      // Put guardrails: never less than 30s, never more than 10m estimate.
      const estimated = clamp(Math.round(baseOverheadMs + msPerRow * totalRows), 30_000, 10 * 60_000);
      return estimated;
    } catch {
      // If estimate fails, still show elapsed timer only.
      return null;
    }
  }, []);

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
    setRunStartedAt(Date.now());
    setElapsedMs(0);
    setEstimatedMs(null);
    try {
      void estimateBackupDurationMs().then((ms) => setEstimatedMs(ms));

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      if (!sessionData.session) {
        toast.error("لازم تسجّل دخول الأول قبل تشغيل النسخ الاحتياطي");
        return;
      }

      const { data, error } = await supabase.functions.invoke("backup-run", {
        body: { schedule_type: "manual" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const runId = data?.run_id as string | undefined;
      if (!runId) throw new Error("لم يتم استلام رقم العملية");

      toast.success("تم بدء النسخ الاحتياطي، سيتم تسجيل الخروج عند الانتهاء");

      // Poll until success/failed (dynamic max wait)
      const started = Date.now();
      const maxWaitMs = Math.max(120_000, (estimatedMs ?? 0) + 30_000);
      while (Date.now() - started < maxWaitMs) {
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

      throw new Error("استغرق النسخ وقتاً أطول من المتوقع (قد تكون البيانات كبيرة). انتظر قليلاً ثم حاول تحديث الحالة.");
    } catch (err: any) {
      toast.error(err?.message ?? "تعذر بدء النسخ");
    } finally {
      setRunning(false);
      setRunStartedAt(null);
      setEstimatedMs(null);
    }
  };

  React.useEffect(() => {
    if (!running || !runStartedAt) return;
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - runStartedAt);
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, runStartedAt]);

  const remainingMs = estimatedMs == null ? null : Math.max(0, estimatedMs - elapsedMs);
  const progressValue = estimatedMs == null ? null : clamp((elapsedMs / estimatedMs) * 100, 2, 98);

  if (!blocking) return null;

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>انتبه: النسخ الاحتياطي مطلوب</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>لم يتم تشغيل نسخة احتياطية ناجحة اليوم بعد 1:30 مساءً.</p>
              <p>يجب عمل نسخة احتياطية الآن قبل تسجيل الخروج.</p>

              {running ? (
                <div className="rounded-md border p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div className="text-muted-foreground">جاري النسخ…</div>
                    <div className="font-mono">
                      <span className="text-muted-foreground">الوقت: </span>
                      <span>{formatDuration(elapsedMs)}</span>
                      {remainingMs != null ? (
                        <>
                          <span className="text-muted-foreground"> — المتبقي: </span>
                          <span>{formatDuration(remainingMs)}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {progressValue != null ? <Progress value={progressValue} /> : null}
                  <div className="text-xs text-muted-foreground">
                    {estimatedMs != null ? "الوقت المتبقي تقديري وقد يزيد/يقل حسب حجم البيانات والاتصال." : "جاري حساب الوقت المتوقع…"}
                  </div>
                </div>
              ) : null}
            </div>
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
