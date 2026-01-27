import * as React from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export type LoanLookupType = "borrower" | "to_department" | "reason";

const typeMeta: Record<LoanLookupType, { table: string; title: string; placeholder: string; queryKey: string }> = {
  borrower: {
    table: "loan_borrowers",
    title: "إضافة مستعير",
    placeholder: "اسم المستعير",
    queryKey: "loan_borrowers",
  },
  to_department: {
    table: "loan_to_departments",
    title: "إضافة قسم مستعار إليه",
    placeholder: "اسم القسم",
    queryKey: "loan_to_departments",
  },
  reason: {
    table: "loan_reasons",
    title: "إضافة سبب",
    placeholder: "سبب الاستعارة",
    queryKey: "loan_reasons",
  },
};

export default function LoanLookupCreateDialog({
  open,
  type,
  onOpenChange,
  initialName,
  onCreated,
}: {
  open: boolean;
  type: LoanLookupType;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onCreated?: (item: { id: string; name: string }) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const meta = React.useMemo(() => typeMeta[type], [type]);

  React.useEffect(() => {
    if (open) setName((initialName ?? "").trim());
  }, [open, initialName]);

  const handleClose = () => {
    setName("");
    onOpenChange(false);
  };

  const handleSave = async () => {
    const clean = name.trim();
    if (!clean) {
      toast({ title: "خطأ", description: "من فضلك اكتب الاسم أولاً", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from(meta.table as any)
        .insert([{ name: clean }])
        .select("id, name")
        .single();

      // لو الاسم موجود بالفعل (Unique) هنعتبرها نجاح صامت
      if (error) {
        const msg = (error as any)?.message ?? "";
        const code = (error as any)?.code;
        if (code === "23505" || msg.toLowerCase().includes("duplicate")) {
          toast({ title: "موجود بالفعل", description: clean });
          handleClose();
          return;
        }
        throw error;
      }

      if ((data as any)?.id && onCreated) onCreated({ id: (data as any).id, name: (data as any).name });
      toast({ title: "تمت الإضافة", description: `تم إضافة: ${clean}` });
      handleClose();
    } catch (e: any) {
      toast({ title: "تعذر الحفظ", description: e?.message ?? "حدث خطأ غير متوقع", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
          <DialogDescription>اكتب الاسم واضغط حفظ لإضافته لقائمة الاقتراحات.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">الاسم</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={meta.placeholder} autoFocus />
          <p className="text-xs text-muted-foreground">بعد الحفظ ستظهر ضمن الاقتراحات.</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
            إلغاء
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
