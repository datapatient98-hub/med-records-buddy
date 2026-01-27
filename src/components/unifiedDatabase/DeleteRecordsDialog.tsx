import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { UnifiedHistoryPayload } from "@/components/UnifiedPatientHistoryDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { getAuditActorLabel, setAuditActorLabel } from "@/lib/auditActor";
import { downloadDeletionAuditExcel } from "@/lib/excel/exportDeletionAuditExcel";

type TableKey = "admissions" | "discharges" | "emergencies" | "endoscopies" | "procedures" | "file_loans";

type SelectableRecord = {
  table: TableKey;
  id: string;
  unified_number?: string | null;
  patient_name?: string | null;
  internal_number?: number | null;
  snapshot: any;
};

const reasonSchema = z.string().trim().min(3, "سبب الحذف مطلوب (3 أحرف على الأقل)").max(500, "سبب الحذف طويل جداً");

export function DeleteRecordsDialog({
  open,
  onOpenChange,
  payload,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  payload: UnifiedHistoryPayload | null;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [actor, setActor] = React.useState(() => getAuditActorLabel());
  const [reason, setReason] = React.useState("");
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (!open) return;
    setActor(getAuditActorLabel());
    setReason("");
    setSelected({});
  }, [open]);

  const items = React.useMemo(() => buildSelectable(payload), [payload]);
  const selectedItems = React.useMemo(() => items.filter((it) => selected[keyOf(it)]), [items, selected]);

  const delMutation = useMutation({
    mutationFn: async () => {
      if (!payload?.unified_number) throw new Error("لا يوجد مريض محدد");
      const parsedReason = reasonSchema.safeParse(reason);
      if (!parsedReason.success) throw new Error(parsedReason.error.issues[0]?.message ?? "سبب الحذف غير صحيح");

      const actorLabel = setAuditActorLabel(actor);
      const reasonValue = parsedReason.data;
      if (selectedItems.length === 0) throw new Error("اختر سجل واحد على الأقل");

      // 1) Insert audit rows first (snapshot), so we always know what was intended.
      const auditRows = selectedItems.map((it) => ({
        deleted_by: actorLabel || null,
        reason: reasonValue,
        unified_number: it.unified_number ?? payload.unified_number ?? null,
        patient_name: it.patient_name ?? pickPatientName(payload) ?? null,
        internal_number: it.internal_number ?? null,
        table_name: it.table,
        record_id: it.id,
        record_snapshot: sanitizeJson(it.snapshot),
      }));

      const { data: inserted, error: insErr } = await supabase
        .from("deletion_audit")
        .insert(auditRows)
        .select("deleted_at, deleted_by, reason, unified_number, patient_name, internal_number, table_name, record_id, record_snapshot");
      if (insErr) throw insErr;

      // 2) Delete in safe order.
      await deleteSelectedRecords(selectedItems);

      // 3) Export Excel (the user asked for it).
      downloadDeletionAuditExcel({
        fileName: `deleted_audit_${payload.unified_number}_${new Date().toISOString().slice(0, 10)}.xlsx`,
        rows: (inserted ?? []) as any,
        exportedAt: new Date(),
      });

      // Refresh any dependent caches
      qc.invalidateQueries();
    },
    onSuccess: () => {
      toast({ title: "تم الحذف", description: "تم حذف السجلات المحددة وتصدير شيت المحذوفات" });
      onOpenChange(false);
      onDeleted();
    },
    onError: (e: any) => {
      toast({ title: "خطأ", description: e?.message || "فشل تنفيذ الحذف", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl">إدارة الحذف (سجلات محددة)</DialogTitle>
        </DialogHeader>

        {!payload?.unified_number ? (
          <div className="text-sm text-muted-foreground">ابحث وافتح Timeline لمريض أولاً.</div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">اسم المنفذ (اختياري لكنه مفيد)</label>
                <Input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="مثال: د/أحمد - جهاز 2" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">سبب الحذف (إلزامي)</label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: إدخال بالخطأ" />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-muted-foreground">
                المحدد: <span className="font-semibold text-foreground">{selectedItems.length}</span>
              </div>
              <Button
                type="button"
                variant="destructive"
                disabled={delMutation.isPending || selectedItems.length === 0}
                onClick={() => delMutation.mutate()}
              >
                {delMutation.isPending ? "جاري الحذف..." : "حذف المحدد + تصدير"}
              </Button>
            </div>

            <ScrollArea className="max-h-[52vh] pr-1">
              <div className="space-y-5">
                <Group title="الدخول" rows={items.filter((i) => i.table === "admissions")} selected={selected} setSelected={setSelected} />
                <Group title="الخروج" rows={items.filter((i) => i.table === "discharges")} selected={selected} setSelected={setSelected} />
                <Group title="الطوارئ" rows={items.filter((i) => i.table === "emergencies")} selected={selected} setSelected={setSelected} />
                <Group title="المناظير" rows={items.filter((i) => i.table === "endoscopies")} selected={selected} setSelected={setSelected} />
                <Group title="الإجراءات" rows={items.filter((i) => i.table === "procedures")} selected={selected} setSelected={setSelected} />
                <Group title="الاستعارات" rows={items.filter((i) => i.table === "file_loans")} selected={selected} setSelected={setSelected} />
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Group({
  title,
  rows,
  selected,
  setSelected,
}: {
  title: string;
  rows: SelectableRecord[];
  selected: Record<string, boolean>;
  setSelected: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  if (!rows.length) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            setSelected((prev) => {
              const next = { ...prev };
              const allSelected = rows.every((r) => !!next[keyOf(r)]);
              for (const r of rows) next[keyOf(r)] = !allSelected;
              return next;
            });
          }}
        >
          تحديد/إلغاء الكل
        </Button>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <label key={keyOf(r)} className="flex items-start gap-3 rounded-md border border-border p-3">
            <Checkbox
              checked={!!selected[keyOf(r)]}
              onCheckedChange={(v) => setSelected((p) => ({ ...p, [keyOf(r)]: !!v }))}
              className="mt-1"
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">
                {r.patient_name || "-"}
                {r.internal_number != null ? <span className="text-muted-foreground"> — داخلي: {r.internal_number}</span> : null}
              </div>
              <div className="text-xs text-muted-foreground font-mono truncate">{r.unified_number || ""}</div>
              <div className="text-xs text-muted-foreground truncate">ID: {r.id}</div>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}

function buildSelectable(payload: UnifiedHistoryPayload | null): SelectableRecord[] {
  if (!payload) return [];

  const unified = payload.unified_number;
  const defaultName = pickPatientName(payload);

  const mapRow = (table: TableKey, r: any): SelectableRecord => ({
    table,
    id: String(r?.id ?? ""),
    unified_number: r?.unified_number ?? unified ?? null,
    patient_name: r?.patient_name ?? defaultName ?? null,
    internal_number: typeof r?.internal_number === "number" ? r.internal_number : null,
    snapshot: r,
  });

  const out: SelectableRecord[] = [];
  for (const r of payload.admissions ?? []) out.push(mapRow("admissions", r));
  for (const r of payload.discharges ?? []) out.push(mapRow("discharges", r));
  for (const r of payload.emergencies ?? []) out.push(mapRow("emergencies", r));
  for (const r of payload.endoscopies ?? []) out.push(mapRow("endoscopies", r));
  for (const r of payload.procedures ?? []) out.push(mapRow("procedures", r));
  for (const r of payload.loans ?? []) out.push(mapRow("file_loans", r));
  return out.filter((r) => !!r.id);
}

function keyOf(r: SelectableRecord) {
  return `${r.table}:${r.id}`;
}

function pickPatientName(p: UnifiedHistoryPayload | null) {
  return (
    p?.admissions?.[0]?.patient_name ??
    p?.emergencies?.[0]?.patient_name ??
    p?.endoscopies?.[0]?.patient_name ??
    p?.procedures?.[0]?.patient_name ??
    null
  );
}

function sanitizeJson(v: unknown) {
  try {
    return JSON.parse(JSON.stringify(v ?? {}));
  } catch {
    return {};
  }
}

async function deleteSelectedRecords(selected: SelectableRecord[]) {
  const byTable = new Map<TableKey, string[]>();
  for (const it of selected) {
    const list = byTable.get(it.table) ?? [];
    list.push(it.id);
    byTable.set(it.table, list);
  }

  const admissionIds = byTable.get("admissions") ?? [];
  if (admissionIds.length) {
    // Clean dependent rows to avoid FK errors
    await supabase.from("discharges").delete().in("admission_id", admissionIds);
    await supabase.from("notes").delete().in("admission_id", admissionIds);
    await supabase.from("file_loans").delete().in("admission_id", admissionIds);
    await supabase.from("procedures").delete().in("admission_id", admissionIds);
    await supabase.from("endoscopies").delete().in("admission_id", admissionIds);
    await supabase.from("emergencies").delete().in("admission_id", admissionIds);
    await supabase.from("admissions").delete().in("id", admissionIds);
  }

  const delById = async (table: Exclude<TableKey, "admissions">, column: string = "id") => {
    const ids = byTable.get(table) ?? [];
    if (!ids.length) return;
    // Supabase client generics can get too deep with dynamic table names.
    // Use a narrowed, runtime-safe call.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = (supabase as any).from(table).delete().in(column, ids);
    const { error } = (await q) as { error?: any };
    if (error) throw error;
  };

  await delById("discharges");
  await delById("emergencies");
  await delById("endoscopies");
  await delById("procedures");
  await delById("file_loans");
}
