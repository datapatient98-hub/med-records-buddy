import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { UnifiedHistoryPayload } from "@/components/UnifiedPatientHistoryDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { getAuditActorLabel, setAuditActorLabel } from "@/lib/auditActor";
import { downloadDeletionAuditExcel } from "@/lib/excel/exportDeletionAuditExcel";

import type { SelectableRecord } from "@/components/unifiedDatabase/deleteRecords/types";
import { DeleteRecordsGroup } from "@/components/unifiedDatabase/deleteRecords/DeleteRecordsGroup";
import { buildSelectable, keyOf, pickPatientName, sanitizeJson } from "@/components/unifiedDatabase/deleteRecords/utils";
import { deleteSelectedRecords } from "@/components/unifiedDatabase/deleteRecords/deleteSelectedRecords";

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
                <DeleteRecordsGroup
                  title="الدخول"
                  rows={items.filter((i) => i.table === "admissions")}
                  selected={selected}
                  setSelected={setSelected}
                />
                <DeleteRecordsGroup
                  title="الخروج"
                  rows={items.filter((i) => i.table === "discharges")}
                  selected={selected}
                  setSelected={setSelected}
                />
                <DeleteRecordsGroup
                  title="الطوارئ"
                  rows={items.filter((i) => i.table === "emergencies")}
                  selected={selected}
                  setSelected={setSelected}
                />
                <DeleteRecordsGroup
                  title="المناظير"
                  rows={items.filter((i) => i.table === "endoscopies")}
                  selected={selected}
                  setSelected={setSelected}
                />
                <DeleteRecordsGroup
                  title="الإجراءات"
                  rows={items.filter((i) => i.table === "procedures")}
                  selected={selected}
                  setSelected={setSelected}
                />
                <DeleteRecordsGroup
                  title="الاستعارات"
                  rows={items.filter((i) => i.table === "file_loans")}
                  selected={selected}
                  setSelected={setSelected}
                />
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
