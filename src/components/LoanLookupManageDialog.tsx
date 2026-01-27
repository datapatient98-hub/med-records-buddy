import * as React from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { LoanLookupType } from "@/components/LoanLookupCreateDialog";

const typeMeta: Record<LoanLookupType, { table: string; title: string; queryKey: string }> = {
  borrower: { table: "loan_borrowers", title: "تعديل قائمة المستعيرين", queryKey: "loan_borrowers" },
  to_department: { table: "loan_to_departments", title: "تعديل قائمة الأقسام المستعار إليها", queryKey: "loan_to_departments" },
  reason: { table: "loan_reasons", title: "تعديل قائمة الأسباب", queryKey: "loan_reasons" },
};

export default function LoanLookupManageDialog({
  open,
  type,
  onOpenChange,
  items,
  onUpdated,
}: {
  open: boolean;
  type: LoanLookupType;
  onOpenChange: (open: boolean) => void;
  items: Array<{ id: string; name: string }>;
  onUpdated?: () => void;
}) {
  const { toast } = useToast();
  const [q, setQ] = React.useState("");
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const meta = React.useMemo(() => typeMeta[type], [type]);

  React.useEffect(() => {
    if (!open) {
      setQ("");
      setDrafts({});
      setBusyId(null);
      return;
    }
    const next: Record<string, string> = {};
    for (const it of items) next[it.id] = it.name;
    setDrafts(next);
  }, [open, items]);

  const filtered = React.useMemo(() => {
    const clean = q.trim().toLowerCase();
    if (!clean) return items;
    return items.filter((i) => i.name.toLowerCase().includes(clean));
  }, [items, q]);

  const saveRow = async (id: string) => {
    const nextName = (drafts[id] ?? "").trim();
    if (!nextName) {
      toast({ title: "خطأ", description: "الاسم لا يمكن أن يكون فارغ", variant: "destructive" });
      return;
    }

    setBusyId(id);
    try {
      const { data, error } = await supabase
        .from(meta.table as any)
        .update({ name: nextName })
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!(data as any)?.id) throw new Error("لم يتم التعديل. ربما لا توجد صلاحية أو العنصر غير موجود.");
      toast({ title: "تم التعديل", description: nextName });
      onUpdated?.();
    } catch (e: any) {
      toast({ title: "تعذر التعديل", description: e?.message ?? "حدث خطأ أثناء التعديل", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث..." />

          <div className="max-h-80 overflow-auto rounded-md border border-border bg-card">
            {filtered.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">لا توجد نتائج</div>
            ) : (
              <div className="divide-y">
                {filtered.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 p-3">
                    <Input
                      value={drafts[item.id] ?? item.name}
                      onChange={(e) => setDrafts((p) => ({ ...p, [item.id]: e.target.value }))}
                      className="h-9"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId === item.id}
                      onClick={() => saveRow(item.id)}
                      className="shrink-0"
                    >
                      {busyId === item.id ? "..." : "حفظ"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">ملاحظة: لا يوجد حذف حسب طلبك.</div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
