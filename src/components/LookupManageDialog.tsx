import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
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
import type { LookupCreateType } from "@/components/LookupCreateDialog";

const typeMeta: Record<LookupCreateType, { table: string; title: string; queryKey: string }> = {
  department: { table: "departments", title: "تعديل الأقسام", queryKey: "departments" },
  diagnosis: { table: "diagnoses", title: "تعديل التشخيصات", queryKey: "diagnoses" },
  doctor: { table: "doctors", title: "تعديل الأطباء", queryKey: "doctors" },
  governorate: { table: "governorates", title: "تعديل المحافظات", queryKey: "governorates" },
  occupation: { table: "occupations", title: "تعديل المهن", queryKey: "occupations" },
  station: { table: "stations", title: "تعديل المحطات", queryKey: "stations" },
  district: { table: "districts", title: "تعديل المراكز/الأحياء", queryKey: "districts" },
};

export default function LookupManageDialog({
  open,
  type,
  onOpenChange,
  items,
}: {
  open: boolean;
  type: LookupCreateType;
  onOpenChange: (open: boolean) => void;
  items: Array<{ id: string; name: string }>;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const meta = useMemo(() => typeMeta[type], [type]);

  const filtered = useMemo(() => {
    const clean = q.trim().toLowerCase();
    if (!clean) return items;
    return items.filter((i) => i.name.toLowerCase().includes(clean));
  }, [items, q]);

  const handleDelete = async (id: string, name: string) => {
    setBusyId(id);
    try {
      // IMPORTANT: With RLS, a DELETE can succeed with 0 affected rows (no error) if the user
      // doesn't have permission. We select to verify the affected row.
      const { data, error } = await supabase
        .from(meta.table as any)
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      const deletedId = (data as any)?.id as string | undefined;
      if (!deletedId) {
        throw new Error("لم يتم الحذف. غالباً لا توجد صلاحية أو أن العنصر غير موجود.");
      }
      await queryClient.invalidateQueries({ queryKey: [meta.queryKey] });
      toast({ title: "تم الحذف", description: `تم حذف: ${name}` });
    } catch (e: any) {
      toast({
        title: "تعذر الحذف",
        description:
          e?.message ?? "قد يكون هذا العنصر مستخدم داخل سجلات مرضى ولا يمكن حذفه حالياً.",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث..." />

          <div className="max-h-72 overflow-auto rounded-md border bg-card">
            {filtered.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">لا توجد نتائج</div>
            ) : (
              <div className="divide-y">
                {filtered.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="text-sm text-foreground truncate">{item.name}</div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={busyId === item.id}
                      onClick={() => handleDelete(item.id, item.name)}
                    >
                      {busyId === item.id ? "..." : "حذف"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
